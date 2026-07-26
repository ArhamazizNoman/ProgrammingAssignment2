/*
 * Tour Cost Tracker — live sync server
 * Zero dependencies. Run with:  node server.js
 *
 * Serves the web app and keeps ONE shared trip in sync across every device
 * using Server-Sent Events (SSE). Data is saved to data.json so it survives
 * restarts. Mutations are granular (add/delete) so two people editing at the
 * same time never clobber each other's changes.
 */
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var PORT = process.env.PORT || 3000;
var DATA_FILE = path.join(__dirname, "data.json");
var PUBLIC_DIR = path.join(__dirname, "public");

// ---- State ----
function defaultState() {
  return {
    people: ["Me (owner)", "Person 2", "Person 3", "Person 4"],
    expenses: [], // { id, desc, amount, payer, date }
    currency: "$"
  };
}

var state = loadState();

function loadState() {
  try {
    var raw = fs.readFileSync(DATA_FILE, "utf8");
    var s = JSON.parse(raw);
    if (!s || !Array.isArray(s.people) || !Array.isArray(s.expenses)) return defaultState();
    if (typeof s.currency !== "string") s.currency = "$";
    return s;
  } catch (e) {
    return defaultState();
  }
}

var saveTimer = null;
function saveState() {
  // Debounced write so bursts of edits don't hammer the disk.
  if (saveTimer) return;
  saveTimer = setTimeout(function () {
    saveTimer = null;
    fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), function (err) {
      if (err) console.error("Failed to save data.json:", err.message);
    });
  }, 150);
}

// ---- SSE clients ----
var clients = []; // array of ServerResponse

function broadcast() {
  var payload = "data: " + JSON.stringify(state) + "\n\n";
  clients.forEach(function (res) {
    try { res.write(payload); } catch (e) {}
  });
}

function commit() {
  saveState();
  broadcast();
}

// ---- Helpers ----
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function sendJson(res, code, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(body);
}

function readBody(req, cb) {
  var chunks = "";
  var tooBig = false;
  req.on("data", function (c) {
    chunks += c;
    if (chunks.length > 1e6) { tooBig = true; req.destroy(); }
  });
  req.on("end", function () {
    if (tooBig) return cb(new Error("body too large"));
    if (!chunks) return cb(null, {});
    try { cb(null, JSON.parse(chunks)); }
    catch (e) { cb(new Error("invalid JSON")); }
  });
  req.on("error", function (e) { cb(e); });
}

var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".ico": "image/x-icon"
};

function serveStatic(req, res) {
  var urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  // Prevent path traversal.
  var safe = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, "");
  var filePath = path.join(PUBLIC_DIR, safe);
  if (filePath.indexOf(PUBLIC_DIR) !== 0) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath, function (err, data) {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

// ---- API ----
function handleApi(req, res) {
  var urlPath = req.url.split("?")[0];
  var method = req.method;

  // SSE stream
  if (urlPath === "/api/events" && method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write("retry: 3000\n\n");
    res.write("data: " + JSON.stringify(state) + "\n\n");
    clients.push(res);
    var ping = setInterval(function () {
      try { res.write(": ping\n\n"); } catch (e) {}
    }, 25000);
    req.on("close", function () {
      clearInterval(ping);
      var i = clients.indexOf(res);
      if (i !== -1) clients.splice(i, 1);
    });
    return;
  }

  if (urlPath === "/api/state" && method === "GET") {
    return sendJson(res, 200, state);
  }

  // Add person
  if (urlPath === "/api/people" && method === "POST") {
    return readBody(req, function (err, body) {
      if (err) return sendJson(res, 400, { error: err.message });
      var name = String(body.name || "").trim().slice(0, 30);
      if (!name) return sendJson(res, 400, { error: "name required" });
      if (state.people.indexOf(name) !== -1) return sendJson(res, 409, { error: "name exists" });
      state.people.push(name);
      commit();
      return sendJson(res, 200, state);
    });
  }

  // Remove person
  if (urlPath === "/api/people" && method === "DELETE") {
    return readBody(req, function (err, body) {
      if (err) return sendJson(res, 400, { error: err.message });
      var name = String(body.name || "");
      state.people = state.people.filter(function (p) { return p !== name; });
      commit();
      return sendJson(res, 200, state);
    });
  }

  // Add expense
  if (urlPath === "/api/expenses" && method === "POST") {
    return readBody(req, function (err, body) {
      if (err) return sendJson(res, 400, { error: err.message });
      var desc = String(body.desc || "").trim().slice(0, 60);
      var amount = Number(body.amount);
      var payer = String(body.payer || "");
      var date = String(body.date || "").slice(0, 10);
      if (!desc) return sendJson(res, 400, { error: "desc required" });
      if (!(amount > 0)) return sendJson(res, 400, { error: "amount must be > 0" });
      if (!payer) return sendJson(res, 400, { error: "payer required" });
      state.expenses.push({ id: uid(), desc: desc, amount: amount, payer: payer, date: date });
      commit();
      return sendJson(res, 200, state);
    });
  }

  // Delete expense: /api/expenses/<id>
  if (urlPath.indexOf("/api/expenses/") === 0 && method === "DELETE") {
    var id = decodeURIComponent(urlPath.slice("/api/expenses/".length));
    state.expenses = state.expenses.filter(function (e) { return e.id !== id; });
    commit();
    return sendJson(res, 200, state);
  }

  // Set currency
  if (urlPath === "/api/currency" && method === "POST") {
    return readBody(req, function (err, body) {
      if (err) return sendJson(res, 400, { error: err.message });
      state.currency = String(body.currency || "").slice(0, 3);
      commit();
      return sendJson(res, 200, state);
    });
  }

  // Reset
  if (urlPath === "/api/reset" && method === "POST") {
    state = defaultState();
    commit();
    return sendJson(res, 200, state);
  }

  return sendJson(res, 404, { error: "not found" });
}

// ---- Server ----
var server = http.createServer(function (req, res) {
  if (req.url.indexOf("/api/") === 0) return handleApi(req, res);
  return serveStatic(req, res);
});

server.listen(PORT, function () {
  console.log("Tour Cost Tracker (live) running at http://localhost:" + PORT);
  console.log("Open that link on any device on the same network to share the trip.");
});
