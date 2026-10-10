package com.claysonio.wordcards;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Kid lock: pins the app with Android screen pinning (lock task mode) so a
 * child can't leave it with Home, Recents or the notification shade.
 *
 * lock() asks Android to pin the app (it shows a one-time "Pin this app?"
 * prompt), unlock() unpins it, status() returns { locked }.
 */
@CapacitorPlugin(name = "KidLock")
public class KidLockPlugin extends Plugin {

    @PluginMethod
    public void lock(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            try {
                if (!isLocked()) activity.startLockTask();
                call.resolve();
            } catch (Exception e) {
                call.reject("Could not lock: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            try {
                if (isLocked()) activity.stopLockTask();
                call.resolve();
            } catch (Exception e) {
                call.reject("Could not unlock: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject o = new JSObject();
        o.put("locked", isLocked());
        call.resolve(o);
    }

    private boolean isLocked() {
        ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        return am != null && am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE;
    }
}
