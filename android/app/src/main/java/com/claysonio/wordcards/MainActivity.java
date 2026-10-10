package com.claysonio.wordcards;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WordListenerPlugin.class);
        registerPlugin(KidLockPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
