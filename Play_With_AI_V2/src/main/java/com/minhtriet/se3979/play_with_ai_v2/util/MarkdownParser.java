package com.minhtriet.se3979.play_with_ai_v2.util;

public final class MarkdownParser {
    private MarkdownParser() {}

    public static String convertMarkdownToHtml(String md) {
        if (md == null || md.isBlank()) return "";
        StringBuilder html = new StringBuilder();
        boolean inCodeBlock = false, inTable = false, isFirstRow = false, inUl = false, inOl = false;
        String[] lines = md.split("\n");

        for (String line : lines) {
            // ==========================================
            // XỬ LÝ MÃ NGUỒN (CODE BLOCK) NHƯ MỘT CỬA SỔ WIN98
            // ==========================================
            if (line.trim().startsWith("```")) {
                if (inTable) { html.append("</tbody></table></div><br>\n"); inTable = false; }
                if (inUl) { html.append("</ul>\n"); inUl = false; }
                if (inOl) { html.append("</ol>\n"); inOl = false; }

                if (inCodeBlock) {
                    html.append("</code></pre></div></div></div><br>\n");
                    inCodeBlock = false;
                } else {
                    // Bọc Code bằng một cửa sổ (Window) có thanh tiêu đề
                    html.append("<div class=\"window\" style=\"margin: 15px 0; width: 100%;\">\n");
                    html.append("  <div class=\"title-bar\" style=\"padding: 2px 4px;\">\n");
                    html.append("    <div class=\"title-bar-text\" style=\"color: #ffffff !important;\">Mã nguồn (Code Snippet)</div>\n");
                    html.append("  </div>\n");
                    html.append("  <div class=\"window-body\" style=\"margin: 0;\">\n");
                    // Khung code lõm xuống, nền trắng giả lập Notepad
                    html.append("    <div class=\"sunken-panel\" style=\"padding: 10px; overflow-x: auto;\">\n");
                    html.append("      <pre style=\"margin: 0; font-family: 'Courier New', monospace;\"><code style=\"font-family: inherit;\">");
                    inCodeBlock = true;
                }
                continue;
            }
            if (inCodeBlock) {
                html.append(line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")).append("\n");
                continue;
            }

            String trimmedLine = line.trim();

            // ==========================================
            // XỬ LÝ BẢNG (TABLE) CHUẨN GIAO DIỆN HÌNH ẢNH
            // ==========================================
            if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
                if (inUl) { html.append("</ul>\n"); inUl = false; }
                if (inOl) { html.append("</ol>\n"); inOl = false; }

                if (!inTable) {
                    html.append("<div style=\"width: 100%; overflow-x: auto; margin: 15px 0;\">\n");
                    // Bảng có viền ngoài chìm
                    html.append("<table class=\"table-win98\">\n");
                    html.append("<tbody>\n");
                    inTable = true; isFirstRow = true;
                }

                if (trimmedLine.matches("^\\|?\\s*[-:]+\\s*\\|.*")) continue;

                html.append("<tr>");
                String[] cells = trimmedLine.substring(1, trimmedLine.length() - 1).split("\\|");
                for (String cellText : cells) {
                    if (isFirstRow) {
                        // Tiêu đề bảng: class rieng de CSS kiem soat
                        html.append("<th class=\"table-head\">")
                                .append(processInlineMarkdown(cellText.trim()))
                                .append("</th>");
                    } else {
                        html.append("<td>")
                                .append(processInlineMarkdown(cellText.trim()))
                                .append("</td>");
                    }
                }
                html.append("</tr>\n"); isFirstRow = false; continue;
            } else if (inTable) {
                html.append("</tbody></table></div><br>\n");
                inTable = false;
            }

            // Xử lý List
            if (trimmedLine.matches("^[-*]\\s+.*")) {
                if (!inUl) { html.append("<ul style=\"margin-left: 20px;\">\n"); inUl = true; }
                html.append("<li>").append(processInlineMarkdown(trimmedLine.substring(2).trim())).append("</li>\n"); continue;
            } else if (inUl) { html.append("</ul>\n"); inUl = false; }

            // Xử lý Numbered List
            if (trimmedLine.matches("^\\d+\\.\\s+.*")) {
                if (!inOl) { html.append("<ol style=\"margin-left: 20px;\">\n"); inOl = true; }
                html.append("<li>").append(processInlineMarkdown(trimmedLine.substring(trimmedLine.indexOf(".") + 1).trim())).append("</li>\n"); continue;
            } else if (inOl) { html.append("</ol>\n"); inOl = false; }

            // Xử lý văn bản thường
            String parsed = processInlineMarkdown(line);
            if (parsed.startsWith("### ")) parsed = "<h3 style='margin: 8px 0; font-size: 1.2em;'>" + parsed.substring(4) + "</h3>";
            else if (parsed.startsWith("## ")) parsed = "<h2 style='margin: 10px 0; font-size: 1.5em;'>" + parsed.substring(3) + "</h2>";
            else if (parsed.startsWith("# ")) parsed = "<h1 style='margin: 12px 0; font-size: 1.8em;'>" + parsed.substring(2) + "</h1>";
            else parsed += "<br>";
            html.append(parsed).append("\n");
        }

        if (inTable) html.append("</tbody></table></div><br>\n");
        if (inUl) html.append("</ul>\n");
        if (inOl) html.append("</ol>\n");
        return html.toString();
    }

    public static String processInlineMarkdown(String text) {
        String parsed = text.replaceAll("(?i)<br\\s*/?>", "[[[BR]]]");
        parsed = parsed.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("[[[BR]]]", "<br>");
        parsed = parsed.replaceAll("\\*\\*(.*?)\\*\\*", "<b>$1</b>").replaceAll("\\*([^\\*]+)\\*", "<i>$1</i>");
        // Inline code lõm mờ
        parsed = parsed.replaceAll("`([^`]+)`", "<code style='background-color: rgba(0,0,0,0.1); color: #800000; padding: 2px 4px; border-bottom: 1px solid #FFF; border-right: 1px solid #FFF; border-top: 1px solid #808080; border-left: 1px solid #808080;'>$1</code>");
        return parsed;
    }
}