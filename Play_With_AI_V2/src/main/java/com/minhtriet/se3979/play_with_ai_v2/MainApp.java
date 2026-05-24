package com.minhtriet.se3979.play_with_ai_v2;

import javafx.application.Application;
import javafx.concurrent.Worker;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.control.TextInputDialog;
import javafx.scene.Scene;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;

import java.net.URL;

public class MainApp extends Application {

    private JavaBridge bridge;

    @Override
    public void start(Stage primaryStage) {
        WebView webView = new WebView();
        webView.setContextMenuEnabled(false);
        WebEngine webEngine = webView.getEngine();
        webEngine.setJavaScriptEnabled(true);

        webEngine.setOnAlert(event -> {
            Alert alert = new Alert(Alert.AlertType.INFORMATION, event.getData(), ButtonType.OK);
            alert.setHeaderText(null);
            alert.showAndWait();
        });

        webEngine.setConfirmHandler(message -> {
            Alert alert = new Alert(Alert.AlertType.CONFIRMATION, message, ButtonType.OK, ButtonType.CANCEL);
            alert.setHeaderText(null);
            return alert.showAndWait().orElse(ButtonType.CANCEL) == ButtonType.OK;
        });

        webEngine.setPromptHandler(param -> {
            TextInputDialog dialog = new TextInputDialog(param.getDefaultValue());
            dialog.setHeaderText(null);
            dialog.setContentText(param.getMessage());
            return dialog.showAndWait().orElse(null);
        });

        webEngine.getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                JSObject window = (JSObject) webEngine.executeScript("window");
                bridge = new JavaBridge(webEngine);
                window.setMember("javaBridge", bridge);
                bridge.initData();
            }
        });

        URL url = getClass().getResource("/web/index.html");
        if (url != null) {
            webEngine.load(url.toExternalForm());
        } else {
            System.err.println("Lỗi: Không tìm thấy file /web/index.html");
        }

        Scene scene = new Scene(webView);
        primaryStage.setTitle("Play With AI - Windows 98 Edition");
        primaryStage.setScene(scene);
        primaryStage.setMinWidth(960);
        primaryStage.setMinHeight(680);
        primaryStage.setWidth(1280);
        primaryStage.setHeight(840);
        primaryStage.show();
    }
}