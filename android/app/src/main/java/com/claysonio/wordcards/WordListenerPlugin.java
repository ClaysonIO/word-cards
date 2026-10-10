package com.claysonio.wordcards;

import android.Manifest;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;
import org.vosk.LibVosk;
import org.vosk.LogLevel;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.RecognitionListener;
import org.vosk.android.SpeechService;
import org.vosk.android.StorageService;

import java.util.ArrayList;
import java.util.List;

/**
 * Fully on-device word recognition with Vosk (Kaldi).
 *
 * The recognizer is restricted to a small grammar (the words of the current set
 * plus "[unk]"), which makes it far more reliable for short, single-word
 * utterances from children than open-vocabulary transcription.
 *
 * Events: "partial" {text}, "result" {text}, "error" {message}
 */
@CapacitorPlugin(
    name = "WordListener",
    permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone") }
)
public class WordListenerPlugin extends Plugin implements RecognitionListener {

    private static final String TAG = "WordListener";
    private static final float SAMPLE_RATE = 16000f;

    private Model model;
    private SpeechService speech;
    private boolean loading;
    private String loadError;
    private final List<PluginCall> waitingForModel = new ArrayList<>();

    @Override
    public void load() {
        LibVosk.setLogLevel(LogLevel.WARNINGS);
    }

    /** Loads (and on first run unpacks) the bundled model in the background. */
    @PluginMethod
    public void prepare(PluginCall call) {
        synchronized (this) {
            if (model != null) { call.resolve(ready(true)); return; }
            if (loadError != null) { call.reject(loadError); return; }
            call.setKeepAlive(true);
            waitingForModel.add(call);
            if (loading) return;
            loading = true;
        }
        StorageService.unpack(getContext(), "model-en-us", "model",
            (m) -> finishLoading(m, null),
            (e) -> finishLoading(null, "Could not load speech model: " + e.getMessage()));
    }

    private void finishLoading(Model m, String error) {
        List<PluginCall> calls;
        synchronized (this) {
            model = m;
            loadError = error;
            loading = false;
            calls = new ArrayList<>(waitingForModel);
            waitingForModel.clear();
        }
        for (PluginCall c : calls) {
            if (m != null) c.resolve(ready(true)); else c.reject(error);
            c.setKeepAlive(false);
        }
    }

    private static JSObject ready(boolean r) {
        JSObject o = new JSObject();
        o.put("ready", r);
        return o;
    }

    /** start({ words: string[] }) — begins listening for any of the given words. */
    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "micPermissionCallback");
            return;
        }
        startListening(call);
    }

    @PermissionCallback
    private void micPermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) startListening(call);
        else call.reject("Microphone permission denied", "DENIED");
    }

    private synchronized void startListening(PluginCall call) {
        if (model == null) { call.reject("Model not ready", "NOT_READY"); return; }
        stopInternal();
        try {
            JSONArray grammar = new JSONArray();
            JSArray words = call.getArray("words", new JSArray());
            for (int i = 0; i < words.length(); i++) {
                grammar.put(words.getString(i).toLowerCase());
            }
            grammar.put("[unk]");
            Recognizer rec = new Recognizer(model, SAMPLE_RATE, grammar.toString());
            speech = new SpeechService(rec, SAMPLE_RATE);
            speech.startListening(this);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "start failed", e);
            stopInternal();
            call.reject("Could not start listening: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopInternal();
        call.resolve();
    }

    private synchronized void stopInternal() {
        if (speech != null) {
            speech.stop();
            speech.shutdown();
            speech = null;
        }
    }

    @Override
    protected void handleOnPause() {
        stopInternal();
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        stopInternal();
        if (model != null) { model.close(); model = null; }
        super.handleOnDestroy();
    }

    // ----- Vosk callbacks (main thread) -----

    private void emit(String event, String hypothesis, String key) {
        try {
            String text = new JSONObject(hypothesis).optString(key, "");
            JSObject o = new JSObject();
            o.put("text", text);
            notifyListeners(event, o);
        } catch (Exception ignored) { }
    }

    @Override public void onPartialResult(String hypothesis) { emit("partial", hypothesis, "partial"); }
    @Override public void onResult(String hypothesis) { emit("result", hypothesis, "text"); }
    @Override public void onFinalResult(String hypothesis) { emit("result", hypothesis, "text"); }

    @Override
    public void onError(Exception e) {
        JSObject o = new JSObject();
        o.put("message", e.getMessage());
        notifyListeners("error", o);
    }

    @Override public void onTimeout() { }
}
