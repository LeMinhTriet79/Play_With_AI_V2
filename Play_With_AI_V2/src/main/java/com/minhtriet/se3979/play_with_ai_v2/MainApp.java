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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;

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

        Path devPath = resolveDevIndexPath();
        if (devPath != null && Files.exists(devPath)) {
            String devUrl = devPath.toUri().toString() + "?v=" + System.currentTimeMillis();
            System.out.println("[WebView] Loading dev HTML: " + devUrl);
            webEngine.load(devUrl);
            primaryStage.setTitle("Play With AI - Windows 98 Edition (DEV)");
        } else {
            URL url = getClass().getResource("/web/index.html");
            if (url != null) {
                String classUrl = url.toExternalForm() + "?v=" + System.currentTimeMillis();
                System.out.println("[WebView] Loading classpath HTML: " + classUrl);
                webEngine.load(classUrl);
                primaryStage.setTitle("Play With AI - Windows 98 Edition (CLASSPATH)");
            } else {
                System.err.println("Lỗi: Không tìm thấy file /web/index.html");
            }
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

    private Path resolveDevIndexPath() {
        List<Path> bases = new ArrayList<>();

        try {
            URL location = MainApp.class.getProtectionDomain().getCodeSource().getLocation();
            if (location != null) {
                Path codePath = Paths.get(location.toURI());
                if (Files.isDirectory(codePath)) {
                    bases.add(codePath);
                    if (codePath.getParent() != null) {
                        bases.add(codePath.getParent());
                    }
                    if (codePath.getParent() != null && codePath.getParent().getParent() != null) {
                        bases.add(codePath.getParent().getParent());
                    }
                } else if (codePath.getParent() != null) {
                    bases.add(codePath.getParent());
                }
            }
        } catch (URISyntaxException ex) {
            System.err.println("[WebView] CodeSource URI error: " + ex.getMessage());
        }

        String userDir = System.getProperty("user.dir");
        if (userDir != null) {
            bases.add(Paths.get(userDir));
        }

        for (Path base : bases) {
            Path cursor = base;
            for (int i = 0; i < 6 && cursor != null; i += 1) {
                Path candidate = cursor.resolve("src/main/resources/web/index.html");
                if (Files.exists(candidate)) {
                    return candidate;
                }
                cursor = cursor.getParent();
            }
        }
        return null;
    }
}