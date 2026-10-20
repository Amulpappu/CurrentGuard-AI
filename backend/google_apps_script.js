/**
 * ==============================================================================
 * CURRENTGUARD AI — GOOGLE SHEETS LIVE DATABASE ADAPTER (APPS SCRIPT)
 * ==============================================================================
 * 
 * INSTRUCTIONS FOR ZERO-VERIFICATION SETUP:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Click "Extensions" > "Apps Script"
 * 3. Replace any code in the editor with this entire file.
 * 4. Click "Deploy" (top right) > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set Description: "CurrentGuard AI Cloud Database"
 * 7. Set "Execute as": "Me"
 * 8. Set "Who has access": "Anyone"  <-- IMPORTANT for zero-API-key operation!
 * 9. Click "Deploy", authorize your Google account once.
 * 10. Copy the Web app URL (ends with /exec) and paste it into CurrentGuard AI Settings!
 * ==============================================================================
 */

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var sheetName = contents.sheet || "Telemetry_Readings";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    // Create sheet and set formatted headers if it doesn't exist yet
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = Object.keys(contents.row);
      sheet.appendRow(headers);

      // Style headers: dark background, white bold text
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#0f172a");
      headerRange.setFontColor("#00e676");
      headerRange.setFontWeight("bold");
      headerRange.setFontSize(10);
      sheet.setFrozenRows(1);
    }

    // Append incoming row values
    var rowValues = Object.values(contents.row);
    sheet.appendRow(rowValues);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      sheet: sheetName,
      rowsCount: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Read endpoint allowing real-time query of sheets data
  try {
    var sheetName = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : "Telemetry_Readings";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "empty", rows: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "empty", rows: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = values[0];
    var result = [];
    // Return latest 50 rows
    var startIdx = Math.max(1, values.length - 50);
    for (var i = startIdx; i < values.length; i++) {
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        item[headers[j]] = values[i][j];
      }
      result.push(item);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      sheet: sheetName,
      count: result.length,
      rows: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
