const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function writeFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function getWidgetBridgeModuleKt(androidPackage) {
  return `package ${androidPackage}.widgets

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetBridge"

    @ReactMethod
    fun updateWidgetData(payloadJson: String) {
        val context = reactApplicationContext
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PAYLOAD, payloadJson)
            .apply()

        TodayTasksWidgetProvider.updateAllWidgets(context)
        WeeklyScoreWidgetProvider.updateAllWidgets(context)
    }

    @ReactMethod
    fun consumePendingTaskToggles(promise: Promise) {
        val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val pending = prefs.getString(KEY_PENDING_TOGGLES, "{}") ?: "{}"
        prefs.edit().remove(KEY_PENDING_TOGGLES).apply()
        promise.resolve(pending)
    }

    companion object {
        const val PREFS_NAME = "twelv_widget_prefs"
        const val KEY_PAYLOAD = "widget_payload"
        const val KEY_PENDING_TOGGLES = "pending_task_toggles"
    }
}
`;
}

function getWidgetBridgePackageKt(androidPackage) {
  return `package ${androidPackage}.widgets

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class WidgetBridgePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(WidgetBridgeModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;
}

function getTodayTasksWidgetProviderKt(androidPackage) {
  return `package ${androidPackage}.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Paint
import android.view.View
import android.widget.RemoteViews
import ${androidPackage}.R
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class TodayTasksWidgetProvider : AppWidgetProvider() {

    private data class WidgetTaskItem(
        val id: Int,
        val title: String,
        val completed: Boolean
    )

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val toggleAction = context.packageName + ".widgets.ACTION_TOGGLE_TASK"
        if (intent.action == toggleAction) {
            val taskId = intent.getIntExtra(EXTRA_TASK_ID, -1)
            val nextCompleted = intent.getBooleanExtra(EXTRA_NEXT_COMPLETED, false)
            if (taskId != -1) {
                handleToggleTaskFromWidget(context, taskId, nextCompleted)
            }
        }
    }

    private fun handleToggleTaskFromWidget(
        context: Context,
        taskId: Int,
        nextCompleted: Boolean
    ) {
        val prefs = context.getSharedPreferences(
            WidgetBridgeModule.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        val raw = prefs.getString(WidgetBridgeModule.KEY_PAYLOAD, null) ?: return
        val data = try {
            JSONObject(raw)
        } catch (_: Exception) {
            return
        }

        val tasksArray = data.optJSONArray("todayTasks") ?: return
        val uncompletedList = mutableListOf<JSONObject>()
        val completedList = mutableListOf<JSONObject>()
        var didChange = false
        var deltaCompleted = 0

        for (i in 0 until tasksArray.length()) {
            val obj = tasksArray.optJSONObject(i) ?: continue
            val id = obj.optInt("id", -1)
            val prevCompleted = obj.optBoolean("completed", false)
            val finalCompleted = if (id == taskId) {
                if (prevCompleted != nextCompleted) {
                    didChange = true
                    deltaCompleted = if (nextCompleted) 1 else -1
                }
                nextCompleted
            } else {
                prevCompleted
            }
            obj.put("completed", finalCompleted)
            if (finalCompleted) {
                completedList.add(obj)
            } else {
                uncompletedList.add(obj)
            }
        }

        if (!didChange) {
            return
        }

        // Uncompleted tasks stay on top, completed tasks move downside
        val sortedArray = JSONArray()
        for (item in uncompletedList) {
            sortedArray.put(item)
        }
        for (item in completedList) {
            sortedArray.put(item)
        }
        data.put("todayTasks", sortedArray)

        val totalToday = data.optInt("totalTodayCount", sortedArray.length())
        val prevCompletedCount = data.optInt("completedTodayCount", 0)
        val newCompletedCount = (prevCompletedCount + deltaCompleted).coerceIn(0, totalToday)
        val newRemainingCount = (totalToday - newCompletedCount).coerceAtLeast(0)

        data.put("completedTodayCount", newCompletedCount)
        data.put("remainingCount", newRemainingCount)

        // Keep weekly score widget numbers aligned immediately too
        val weekTaskTotal = data.optInt("taskTotal", 0)
        if (weekTaskTotal > 0) {
            val prevWeekCompleted = data.optInt("taskCompleted", 0)
            val newWeekCompleted = (prevWeekCompleted + deltaCompleted).coerceIn(0, weekTaskTotal)
            val newWeekPct = Math.round((newWeekCompleted * 100.0) / weekTaskTotal).toInt()
            data.put("taskCompleted", newWeekCompleted)
            data.put("taskPct", newWeekPct)
        }

        val pendingRaw = prefs.getString(WidgetBridgeModule.KEY_PENDING_TOGGLES, "{}") ?: "{}"
        val pendingJson = try {
            JSONObject(pendingRaw)
        } catch (_: Exception) {
            JSONObject()
        }
        pendingJson.put(taskId.toString(), nextCompleted)

        prefs.edit()
            .putString(WidgetBridgeModule.KEY_PAYLOAD, data.toString())
            .putString(WidgetBridgeModule.KEY_PENDING_TOGGLES, pendingJson.toString())
            .apply()

        updateAllWidgets(context)
        WeeklyScoreWidgetProvider.updateAllWidgets(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val prefs = context.getSharedPreferences(
            WidgetBridgeModule.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        val raw = prefs.getString(WidgetBridgeModule.KEY_PAYLOAD, null)
        val data = try {
            if (raw != null) JSONObject(raw) else null
        } catch (_: Exception) {
            null
        }

        val remainingCount = data?.optInt("remainingCount", 0) ?: 0
        val completedToday = data?.optInt("completedTodayCount", 0) ?: 0
        val totalToday = data?.optInt("totalTodayCount", 0) ?: 0
        val hasChallenge = data?.optBoolean("hasChallenge", false) ?: false
        val tasksArray = data?.optJSONArray("todayTasks")

        val uncompletedItems = mutableListOf<WidgetTaskItem>()
        val completedItems = mutableListOf<WidgetTaskItem>()
        if (tasksArray != null) {
            for (i in 0 until tasksArray.length()) {
                val obj = tasksArray.optJSONObject(i)
                if (obj != null) {
                    val id = obj.optInt("id", -1)
                    val title = obj.optString("title", "").trim()
                    val done = obj.optBoolean("completed", false)
                    if (title.isNotEmpty()) {
                        val entry = WidgetTaskItem(id, title, done)
                        if (done) {
                            completedItems.add(entry)
                        } else {
                            uncompletedItems.add(entry)
                        }
                    }
                }
            }
        }
        val items = uncompletedItems + completedItems

        val dateFormatter = SimpleDateFormat("EEEE, d MMM", Locale.ENGLISH)
        val headerDate = "TWELV · " + dateFormatter.format(Date()).uppercase(Locale.ENGLISH)

        val rowContainers = intArrayOf(
            R.id.widget_task_row_1,
            R.id.widget_task_row_2,
            R.id.widget_task_row_3,
            R.id.widget_task_row_4,
            R.id.widget_task_row_5
        )
        val rowIcons = intArrayOf(
            R.id.widget_task_icon_1,
            R.id.widget_task_icon_2,
            R.id.widget_task_icon_3,
            R.id.widget_task_icon_4,
            R.id.widget_task_icon_5
        )
        val rowTexts = intArrayOf(
            R.id.widget_task_text_1,
            R.id.widget_task_text_2,
            R.id.widget_task_text_3,
            R.id.widget_task_text_4,
            R.id.widget_task_text_5
        )

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val openAppPendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                context,
                101,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else {
            null
        }

        val toggleAction = context.packageName + ".widgets.ACTION_TOGGLE_TASK"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_today_tasks)

            if (openAppPendingIntent != null) {
                views.setOnClickPendingIntent(R.id.widget_tasks_header, openAppPendingIntent)
                views.setOnClickPendingIntent(R.id.widget_tasks_footer, openAppPendingIntent)
                views.setOnClickPendingIntent(R.id.widget_tasks_empty, openAppPendingIntent)
            }

            views.setTextViewText(R.id.widget_tasks_date_header, headerDate)

            val badgeText = when {
                !hasChallenge -> "Setup"
                remainingCount == 0 && totalToday > 0 -> "Done"
                else -> "" + remainingCount + " left"
            }
            views.setTextViewText(R.id.widget_tasks_badge, badgeText)

            val safeMax = if (totalToday > 0) totalToday else 1
            val safeProgress = if (totalToday > 0) completedToday else 0
            views.setProgressBar(R.id.widget_focus_progress, safeMax, safeProgress, false)
            views.setTextViewText(
                R.id.widget_focus_ratio,
                "" + completedToday + "/" + totalToday
            )

            if (items.isEmpty()) {
                for (rowId in rowContainers) {
                    views.setViewVisibility(rowId, View.GONE)
                }
                views.setViewVisibility(R.id.widget_tasks_empty, View.VISIBLE)
                val emptyMsg = when {
                    !hasChallenge -> "Open Twelv to start your 12-week cycle."
                    else -> "No tasks scheduled for today. Tap to add."
                }
                views.setTextViewText(R.id.widget_tasks_empty, emptyMsg)
            } else {
                views.setViewVisibility(R.id.widget_tasks_empty, View.GONE)
                for (idx in rowContainers.indices) {
                    if (idx < items.size) {
                        val item = items[idx]
                        views.setViewVisibility(rowContainers[idx], View.VISIBLE)
                        views.setTextViewText(rowTexts[idx], item.title)

                        if (item.completed) {
                            views.setImageViewResource(rowIcons[idx], R.drawable.ic_widget_check)
                            views.setTextColor(rowTexts[idx], Color.parseColor("#8A99AD"))
                            views.setInt(
                                rowTexts[idx],
                                "setPaintFlags",
                                Paint.STRIKE_THRU_TEXT_FLAG or Paint.ANTI_ALIAS_FLAG
                            )
                        } else {
                            views.setImageViewResource(rowIcons[idx], R.drawable.ic_widget_circle)
                            views.setTextColor(rowTexts[idx], Color.parseColor("#F1F5F9"))
                            views.setInt(
                                rowTexts[idx],
                                "setPaintFlags",
                                Paint.ANTI_ALIAS_FLAG
                            )
                        }

                        if (item.id != -1) {
                            val toggleIntent = Intent(toggleAction).apply {
                                component = ComponentName(context, TodayTasksWidgetProvider::class.java)
                                putExtra(EXTRA_TASK_ID, item.id)
                                putExtra(EXTRA_NEXT_COMPLETED, !item.completed)
                            }
                            val togglePendingIntent = PendingIntent.getBroadcast(
                                context,
                                200 + idx,
                                toggleIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                            )
                            views.setOnClickPendingIntent(rowContainers[idx], togglePendingIntent)
                        } else if (openAppPendingIntent != null) {
                            views.setOnClickPendingIntent(rowContainers[idx], openAppPendingIntent)
                        }
                    } else {
                        views.setViewVisibility(rowContainers[idx], View.GONE)
                    }
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    companion object {
        const val EXTRA_TASK_ID = "extra_task_id"
        const val EXTRA_NEXT_COMPLETED = "extra_next_completed"

        fun updateAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, TodayTasksWidgetProvider::class.java)
            val ids = manager.getAppWidgetIds(component)
            if (ids.isNotEmpty()) {
                TodayTasksWidgetProvider().onUpdate(context, manager, ids)
            }
        }
    }
}
`;
}

function getWeeklyScoreWidgetProviderKt(androidPackage) {
  return `package ${androidPackage}.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.graphics.Color
import android.widget.RemoteViews
import ${androidPackage}.R
import org.json.JSONObject

class WeeklyScoreWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val prefs = context.getSharedPreferences(
            WidgetBridgeModule.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        val raw = prefs.getString(WidgetBridgeModule.KEY_PAYLOAD, null)
        val data = try {
            if (raw != null) JSONObject(raw) else null
        } catch (_: Exception) {
            null
        }

        val weekLabel = data?.optString("weekLabel", "Twelv · Score") ?: "Twelv · Score"
        val taskPct = data?.optInt("taskPct", 0) ?: 0
        val taskCompleted = data?.optInt("taskCompleted", 0) ?: 0
        val taskTotal = data?.optInt("taskTotal", 0) ?: 0
        val habitPct = data?.optInt("habitPct", 0) ?: 0
        val habitCompleted = data?.optInt("habitCompleted", 0) ?: 0
        val habitTotal = data?.optInt("habitTotal", 0) ?: 0
        val statusTone = data?.optString("statusTone", "neutral") ?: "neutral"
        val statusLabel = data?.optString("statusLabel", "85% Goal") ?: "85% Goal"

        val badgeBg = when (statusTone) {
            "success" -> R.drawable.widget_badge_success
            "warning" -> R.drawable.widget_badge_warning
            else -> R.drawable.widget_badge_neutral
        }
        val badgeTextColor = when (statusTone) {
            "success" -> Color.parseColor("#34D399")
            "warning" -> Color.parseColor("#FBBF24")
            else -> Color.parseColor("#94A3B8")
        }

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                context,
                102,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else {
            null
        }

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_weekly_score)

            if (pendingIntent != null) {
                views.setOnClickPendingIntent(R.id.widget_score_root, pendingIntent)
            }

            views.setTextViewText(R.id.widget_score_title, weekLabel)
            views.setTextViewText(R.id.widget_score_status, statusLabel)
            views.setInt(R.id.widget_score_status, "setBackgroundResource", badgeBg)
            views.setTextColor(R.id.widget_score_status, badgeTextColor)

            views.setTextViewText(R.id.widget_score_tasks_pct, "" + taskPct + "%")
            views.setTextViewText(
                R.id.widget_score_tasks_sub,
                "" + taskCompleted + "/" + taskTotal + " done"
            )

            views.setTextViewText(R.id.widget_score_habits_pct, "" + habitPct + "%")
            views.setTextViewText(
                R.id.widget_score_habits_sub,
                "" + habitCompleted + "/" + habitTotal + " done"
            )

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    companion object {
        fun updateAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, WeeklyScoreWidgetProvider::class.java)
            val ids = manager.getAppWidgetIds(component)
            if (ids.isNotEmpty()) {
                WeeklyScoreWidgetProvider().onUpdate(context, manager, ids)
            }
        }
    }
}
`;
}

const WIDGET_BG_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#111827" />
    <stroke android:width="1dp" android:color="#1F2937" />
    <corners android:radius="22dp" />
</shape>
`;

const WIDGET_PILL_LEFT_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#1B2838" />
    <corners android:radius="12dp" />
</shape>
`;

const WIDGET_PROGRESS_DRAWABLE_XML = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:id="@android:id/background">
        <shape android:shape="rectangle">
            <solid android:color="#233042" />
            <corners android:radius="999dp" />
        </shape>
    </item>
    <item android:id="@android:id/progress">
        <clip>
            <shape android:shape="rectangle">
                <solid android:color="#38BDF8" />
                <corners android:radius="999dp" />
            </shape>
        </clip>
    </item>
</layer-list>
`;

const IC_WIDGET_CHECK_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="22dp"
    android:height="22dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#16324A"
        android:pathData="M12,2.5A9.5,9.5 0,1 1,2.5 12A9.5,9.5 0,0 1,12 2.5Z"
        android:strokeWidth="2.0"
        android:strokeColor="#38BDF8" />
    <path
        android:fillColor="#00000000"
        android:pathData="M8.0,12.2L10.8,15.0L16.2,9.2"
        android:strokeWidth="2.2"
        android:strokeColor="#38BDF8"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
</vector>
`;

const IC_WIDGET_CIRCLE_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="22dp"
    android:height="22dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#00000000"
        android:pathData="M12,2.8A9.2,9.2 0,1 1,2.8 12A9.2,9.2 0,0 1,12 2.8Z"
        android:strokeWidth="2.0"
        android:strokeColor="#64748B" />
</vector>
`;

const WIDGET_BADGE_NEUTRAL_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#1E293B" />
    <corners android:radius="999dp" />
</shape>
`;

const WIDGET_BADGE_SUCCESS_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#12382B" />
    <corners android:radius="999dp" />
</shape>
`;

const WIDGET_BADGE_WARNING_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#3A2A12" />
    <corners android:radius="999dp" />
</shape>
`;

const WIDGET_TODAY_TASKS_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_tasks_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_bg"
    android:orientation="vertical"
    android:padding="16dp">

    <!-- Top Header Row -->
    <LinearLayout
        android:id="@+id/widget_tasks_header"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:id="@+id/widget_tasks_date_header"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:ellipsize="end"
                android:letterSpacing="0.05"
                android:maxLines="1"
                android:text="TWELV · TODAY"
                android:textColor="#94A3B8"
                android:textSize="11sp"
                android:textStyle="bold" />

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="2dp"
                android:ellipsize="end"
                android:maxLines="1"
                android:text="Today&apos;s focus"
                android:textColor="#F8FAFC"
                android:textSize="20sp"
                android:textStyle="bold" />
        </LinearLayout>

        <TextView
            android:id="@+id/widget_tasks_badge"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/widget_pill_left"
            android:paddingLeft="13dp"
            android:paddingTop="8dp"
            android:paddingRight="13dp"
            android:paddingBottom="8dp"
            android:text="0 left"
            android:textColor="#38BDF8"
            android:textSize="14sp"
            android:textStyle="bold" />
    </LinearLayout>

    <!-- Progress Bar + Ratio Row -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <ProgressBar
            android:id="@+id/widget_focus_progress"
            style="?android:attr/progressBarStyleHorizontal"
            android:layout_width="0dp"
            android:layout_height="5dp"
            android:layout_weight="1"
            android:max="5"
            android:progress="0"
            android:progressDrawable="@drawable/widget_progress_drawable" />

        <TextView
            android:id="@+id/widget_focus_ratio"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginLeft="10dp"
            android:text="0/0"
            android:textColor="#94A3B8"
            android:textSize="12sp"
            android:textStyle="bold" />
    </LinearLayout>

    <!-- Task List Container -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_marginTop="12dp"
        android:layout_weight="1"
        android:orientation="vertical">

        <TextView
            android:id="@+id/widget_tasks_empty"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="6dp"
            android:text="No tasks scheduled for today. Tap to add."
            android:textColor="#94A3B8"
            android:textSize="15sp"
            android:visibility="gone" />

        <!-- Row 1 -->
        <LinearLayout
            android:id="@+id/widget_task_row_1"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:paddingTop="5dp"
            android:paddingBottom="5dp">

            <ImageView
                android:id="@+id/widget_task_icon_1"
                android:layout_width="22dp"
                android:layout_height="22dp"
                android:src="@drawable/ic_widget_circle" />

            <TextView
                android:id="@+id/widget_task_text_1"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginLeft="12dp"
                android:layout_weight="1"
                android:ellipsize="end"
                android:maxLines="1"
                android:textColor="#F1F5F9"
                android:textSize="17sp" />
        </LinearLayout>

        <!-- Row 2 -->
        <LinearLayout
            android:id="@+id/widget_task_row_2"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:paddingTop="5dp"
            android:paddingBottom="5dp">

            <ImageView
                android:id="@+id/widget_task_icon_2"
                android:layout_width="22dp"
                android:layout_height="22dp"
                android:src="@drawable/ic_widget_circle" />

            <TextView
                android:id="@+id/widget_task_text_2"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginLeft="12dp"
                android:layout_weight="1"
                android:ellipsize="end"
                android:maxLines="1"
                android:textColor="#F1F5F9"
                android:textSize="17sp" />
        </LinearLayout>

        <!-- Row 3 -->
        <LinearLayout
            android:id="@+id/widget_task_row_3"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:paddingTop="5dp"
            android:paddingBottom="5dp">

            <ImageView
                android:id="@+id/widget_task_icon_3"
                android:layout_width="22dp"
                android:layout_height="22dp"
                android:src="@drawable/ic_widget_circle" />

            <TextView
                android:id="@+id/widget_task_text_3"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginLeft="12dp"
                android:layout_weight="1"
                android:ellipsize="end"
                android:maxLines="1"
                android:textColor="#F1F5F9"
                android:textSize="17sp" />
        </LinearLayout>

        <!-- Row 4 -->
        <LinearLayout
            android:id="@+id/widget_task_row_4"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:paddingTop="5dp"
            android:paddingBottom="5dp">

            <ImageView
                android:id="@+id/widget_task_icon_4"
                android:layout_width="22dp"
                android:layout_height="22dp"
                android:src="@drawable/ic_widget_circle" />

            <TextView
                android:id="@+id/widget_task_text_4"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginLeft="12dp"
                android:layout_weight="1"
                android:ellipsize="end"
                android:maxLines="1"
                android:textColor="#F1F5F9"
                android:textSize="17sp" />
        </LinearLayout>

        <!-- Row 5 -->
        <LinearLayout
            android:id="@+id/widget_task_row_5"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:paddingTop="5dp"
            android:paddingBottom="5dp">

            <ImageView
                android:id="@+id/widget_task_icon_5"
                android:layout_width="22dp"
                android:layout_height="22dp"
                android:src="@drawable/ic_widget_circle" />

            <TextView
                android:id="@+id/widget_task_text_5"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginLeft="12dp"
                android:layout_weight="1"
                android:ellipsize="end"
                android:maxLines="1"
                android:textColor="#F1F5F9"
                android:textSize="17sp" />
        </LinearLayout>
    </LinearLayout>

    <!-- Bottom Footer Row -->
    <LinearLayout
        android:id="@+id/widget_tasks_footer"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:gravity="end|center_vertical"
        android:orientation="horizontal">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="View all tasks ↗"
            android:textColor="#38BDF8"
            android:textSize="13sp"
            android:textStyle="bold" />
    </LinearLayout>
</LinearLayout>
`;

const WIDGET_WEEKLY_SCORE_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_score_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_bg"
    android:orientation="vertical"
    android:padding="14dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <TextView
            android:id="@+id/widget_score_title"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="Week 1 of 12"
            android:textColor="#F8FAFC"
            android:textSize="14sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_score_status"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/widget_badge_neutral"
            android:paddingLeft="9dp"
            android:paddingTop="3dp"
            android:paddingRight="9dp"
            android:paddingBottom="3dp"
            android:text="85% Goal"
            android:textColor="#94A3B8"
            android:textSize="11sp"
            android:textStyle="bold" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_marginTop="10dp"
        android:layout_weight="1"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="TASKS"
                android:textColor="#64748B"
                android:textSize="10sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_score_tasks_pct"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="2dp"
                android:text="0%"
                android:textColor="#38BDF8"
                android:textSize="22sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_score_tasks_sub"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="0/0 done"
                android:textColor="#94A3B8"
                android:textSize="11sp" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="HABITS"
                android:textColor="#64748B"
                android:textSize="10sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_score_habits_pct"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="2dp"
                android:text="0%"
                android:textColor="#A78BFA"
                android:textSize="22sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_score_habits_sub"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="0/0 done"
                android:textColor="#94A3B8"
                android:textSize="11sp" />
        </LinearLayout>
    </LinearLayout>
</LinearLayout>
`;

const WIDGET_TODAY_TASKS_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_today_tasks_desc"
    android:initialLayout="@layout/widget_today_tasks"
    android:minWidth="250dp"
    android:minHeight="210dp"
    android:minResizeHeight="120dp"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />
`;

const WIDGET_WEEKLY_SCORE_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_weekly_score_desc"
    android:initialLayout="@layout/widget_weekly_score"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />
`;

const WIDGET_STRINGS_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="widget_today_tasks_label">Twelv · Today\\'s Focus</string>
    <string name="widget_weekly_score_label">Twelv · Execution Score</string>
    <string name="widget_today_tasks_desc">Shows today\\'s focus progress, completed tasks, and remaining tasks.</string>
    <string name="widget_weekly_score_desc">Shows your current 12-week Task and Habit execution percentages.</string>
</resources>
`;

function withTwelvWidgets(config) {
  const androidPackage = config.android?.package || "com.twelv.tracker";

  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) {
      return mod;
    }

    const existingReceivers = Array.isArray(app.receiver) ? app.receiver : [];
    const widgetNames = new Set([
      ".widgets.TodayTasksWidgetProvider",
      ".widgets.WeeklyScoreWidgetProvider",
    ]);

    const filteredReceivers = existingReceivers.filter(
      (r) => !widgetNames.has(r.$?.["android:name"]),
    );

    filteredReceivers.push(
      {
        $: {
          "android:name": ".widgets.TodayTasksWidgetProvider",
          "android:exported": "true",
          "android:label": "@string/widget_today_tasks_label",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
              {
                $: {
                  "android:name": `${androidPackage}.widgets.ACTION_TOGGLE_TASK`,
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/widget_today_tasks_info",
            },
          },
        ],
      },
      {
        $: {
          "android:name": ".widgets.WeeklyScoreWidgetProvider",
          "android:exported": "true",
          "android:label": "@string/widget_weekly_score_label",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/widget_weekly_score_info",
            },
          },
        ],
      },
    );

    app.receiver = filteredReceivers;
    return mod;
  });

  config = withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;
    const importLine = `import ${androidPackage}.widgets.WidgetBridgePackage`;
    if (!contents.includes(importLine)) {
      contents = contents.replace(
        /^package\s+[^\r\n]+/m,
        (match) => `${match}\n\n${importLine}`,
      );
    }
    if (!contents.includes("add(WidgetBridgePackage())")) {
      contents = contents.replace(
        "PackageList(this).packages.apply {",
        "PackageList(this).packages.apply {\n              add(WidgetBridgePackage())",
      );
    }
    mod.modResults.contents = contents;
    return mod;
  });

  config = withDangerousMod(config, [
    "android",
    async (mod) => {
      const mainDir = path.join(
        mod.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
      );
      const javaDir = path.join(
        mainDir,
        "java",
        ...androidPackage.split("."),
        "widgets",
      );
      const resDir = path.join(mainDir, "res");

      writeFileEnsured(
        path.join(javaDir, "WidgetBridgeModule.kt"),
        getWidgetBridgeModuleKt(androidPackage),
      );
      writeFileEnsured(
        path.join(javaDir, "WidgetBridgePackage.kt"),
        getWidgetBridgePackageKt(androidPackage),
      );
      writeFileEnsured(
        path.join(javaDir, "TodayTasksWidgetProvider.kt"),
        getTodayTasksWidgetProviderKt(androidPackage),
      );
      writeFileEnsured(
        path.join(javaDir, "WeeklyScoreWidgetProvider.kt"),
        getWeeklyScoreWidgetProviderKt(androidPackage),
      );

      writeFileEnsured(
        path.join(resDir, "drawable", "widget_bg.xml"),
        WIDGET_BG_XML,
      );
      writeFileEnsured(
        path.join(resDir, "drawable", "widget_pill_left.xml"),
        WIDGET_PILL_LEFT_XML,
      );
      writeFileEnsured(
        path.join(resDir, "drawable", "widget_progress_drawable.xml"),
        WIDGET_PROGRESS_DRAWABLE_XML,
      );
      writeFileEnsured(
        path.join(resDir, "drawable", "ic_widget_check.xml"),
        IC_WIDGET_CHECK_XML,
      );
      writeFileEnsured(
        path.join(resDir, "drawable", "ic_widget_circle.xml"),
        IC_WIDGET_CIRCLE_XML,
      );
      writeFileEnsured(
        path.join(resDir, "drawable", "widget_badge_neutral.xml"),
        WIDGET_BADGE_NEUTRAL_XML,
      );
      writeFileEnsured(
        path.join(resDir, "drawable", "widget_badge_success.xml"),
        WIDGET_BADGE_SUCCESS_XML,
      );
      writeFileEnsured(
        path.join(resDir, "drawable", "widget_badge_warning.xml"),
        WIDGET_BADGE_WARNING_XML,
      );

      writeFileEnsured(
        path.join(resDir, "layout", "widget_today_tasks.xml"),
        WIDGET_TODAY_TASKS_LAYOUT_XML,
      );
      writeFileEnsured(
        path.join(resDir, "layout", "widget_weekly_score.xml"),
        WIDGET_WEEKLY_SCORE_LAYOUT_XML,
      );

      writeFileEnsured(
        path.join(resDir, "xml", "widget_today_tasks_info.xml"),
        WIDGET_TODAY_TASKS_INFO_XML,
      );
      writeFileEnsured(
        path.join(resDir, "xml", "widget_weekly_score_info.xml"),
        WIDGET_WEEKLY_SCORE_INFO_XML,
      );

      writeFileEnsured(
        path.join(resDir, "values", "widget_strings.xml"),
        WIDGET_STRINGS_XML,
      );

      return mod;
    },
  ]);

  return config;
}

module.exports = withTwelvWidgets;
