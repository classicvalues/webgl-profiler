// This file is generated from webgl-profiler.ts. Do not edit this file directly.
;(function() {"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
/*
 * This is a utility class for profiling GPU-side operations using the
 * EXT_disjoint_timer_query OpenGL extension.
 *
 * We need to do special profiling GPU-side because CPU-side gl
 * calls are not synchronized with the GPU's actual execution of those
 * commands. Instead, to measure how long things are taking on the GPU, we
 * need to insert special commands into the GPU's command queue telling it
 * when to start a timer and when to stop the timer.
 *
 * This extension has a number of annoying limitations:
 *  - Only one query can be active at a time. This means that we need to
 *    implement nested timers ourselves in order to be able to produce
 *    helpful flamegraphs.
 *  - This currently only works in Desktop Chrome >= 70.
 *    The extension was completedly removed in Chrome in Chrome 65
 *    (https://crbug.com/808744) and Firefox 63 due to a severe security
 *    vulnerability (https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2018-10229).
 *    It was re-introduced in Chrome 70 (https://crbug.com/820891). There's
 *    an open bug for re-exposing this in Android Chrome (https://crbug.com/870491).
 *  - There's no way to ask for a timestamp. This is what `TIMESTAMP_EXT`
 *    was designed for, but it was removed in 2016 (https://crbug.com/595172).
 *    This makes it difficult to see how much time has elapsed between queries,
 *    so instead we need to have queries always running.
 *  - It seems like the elapsed time for every command other than draw calls is
 *    indicated as zero on GPUs I've tested. The total elapsed times still seem
 *    ballpark correct when comparing against active GPU time in a Chrome
 *    performance profile, however. This could either mean that the GPU times of
 *    other commands are negligible, or that the EXT_disjoint_timer_query is lying
 *    in this cases :|
 *
 * Since only one disjoint timer query can be active at a time, in order to create
 * nested timers, we mark "OPEN_FRAME" and "CLOSE_FRAME" events along the timeline
 * by changing the active timer at each event. It should look something like this:
 *
 *                                ---------- Time --------->
 *
 * Queries   q1      q2      q3        q4        q5    q6      q7          q8      q9
 *          <-> <---------> <---> <-----------> <---> <--> <----------> <-------> <->
 *
 * Stack   +---+-----------------------------------------------------------------+---+
 *             |                         Draw Frame                              |
 *             +-----------+-------------------------+----+------------+---------+
 *                         |        Draw Node        |    | Draw Hover |
 *                         +-----+-------------+-----+    +------------+
 *                               | Draw Shadow |
 *                               +-------------+
 *
 * Events
 *    q1 start: profile start
 *    q2 start: OPEN_FRAME "Draw Frame"
 *    q3 start: OPEN_FRAME "Draw Node"
 *    q4 start: OPEN_FRAME "Draw Shadow"
 *    q5 start: CLOSE_FRAME "Draw Shadow"
 *    q6 start: CLOSE_FRAME "Draw Node"
 *    q7 start: OPEN_FRAME "Draw Hover"
 *    q8 start: CLOSE_FRAME "Draw Hover"
 *    q9 start: CLOSE_FRAME "Draw Frame"
 *    q9 end: profile end
 *
 * For each query, the only information we know about it is its duration.
 * Assuming we have timing queries running for the entire duration of the
 * profile, however, this is sufficient to construct a flamegraph as long as
 * we remember what event is associated with the start/end of each query.
 */
var WebGLProfiler = /** @class */ (function () {
    function WebGLProfiler(context) {
        this.ext = null;
        this.activeQuery = null;
        this.isRunning = false;
        // This list contains events whose beginQueryEXT/endQueryEXT calls have been
        // enqueued in the GPU command buffer, but whose timing results aren't yet
        // available. These are in chronological order.
        this.eventsPendingTimestamps = [];
        // This list contains events whose timestamps have already been inferred based
        // on the durations retrieved from the GPU. These are also in chronological order.
        this.resolvedEvents = [];
        // This is a stack of currently active named contexts. This is used to validate
        // that the pushContext/popContext calls match up properly.
        this.namedContextStack = [];
        this.context = context;
        this.ext = context.getExtension("EXT_disjoint_timer_query");
    }
    WebGLProfiler.prototype.isProfilerRunning = function () {
        return this.isRunning;
    };
    WebGLProfiler.prototype.start = function () {
        if (this.ext == null) {
            throw new Error("EXT_disjoint_timer_query WebGL extension is not available. Cannot start profiler.");
        }
        if (this.isRunning) {
            throw new Error("Profiler is already running");
        }
        var infoExt = this.context.getExtension("WEBGL_debug_renderer_info");
        if (infoExt != null) {
            var renderer = this.context.getParameter(infoExt.UNMASKED_RENDERER_WEBGL);
            if (renderer.indexOf("NVIDIA GeForce GT 750M") !== -1) {
                // See: https://twitter.com/jlfwong/status/1058475013546770432
                throw new Error(renderer + " cards seem to have a buggy implementation of EXT_disjoint_timer_query. Refusing to record to avoid misleading results.");
            }
        }
        this.isRunning = true;
        this.eventsPendingTimestamps = [];
        this.resolvedEvents = [];
        this.activeQuery = this.ext.createQueryEXT();
        this.ext.beginQueryEXT(this.ext.TIME_ELAPSED_EXT, this.activeQuery);
        this.pushContext("profile");
    };
    WebGLProfiler.prototype.stop = function () {
        if (this.ext == null) {
            return;
        }
        if (!this.isRunning) {
            throw new Error("Profiler is already stopped");
        }
        this.isRunning = false;
        this.popContext("profile");
        this.activeQuery = null;
        this.ext.endQueryEXT(this.ext.TIME_ELAPSED_EXT);
    };
    WebGLProfiler.prototype.pushContext = function (name) {
        this.markAction({ type: GPUProfilerActionType.OPEN_FRAME, name: name });
        this.namedContextStack.push(name);
    };
    WebGLProfiler.prototype.popContext = function (name) {
        if (this.namedContextStack.length === 0) {
            throw new Error("Tried to pop a context when the context stack is empty!");
        }
        var popped = this.namedContextStack.pop();
        if (popped !== name) {
            throw new Error("Expected popContext to be called with " + popped + ", but it was called with " + name);
        }
        this.markAction({ type: GPUProfilerActionType.CLOSE_FRAME, name: name });
    };
    WebGLProfiler.prototype.withContext = function (name, callback) {
        this.pushContext(name);
        callback();
        this.popContext(name);
    };
    WebGLProfiler.prototype.exportSpeedscopeProfile = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.eventsPendingTimestamps.length > 0)) return [3 /*break*/, 2];
                        this.resolveEventsIfPossible();
                        return [4 /*yield*/, new Promise(function (resolve) { return requestAnimationFrame(resolve); })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 0];
                    case 2: return [2 /*return*/, this.toSpeedscopeProfile()];
                }
            });
        });
    };
    WebGLProfiler.prototype.downloadWhenReady = function () {
        return __awaiter(this, void 0, void 0, function () {
            var profileText, link;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.exportSpeedscopeProfile()];
                    case 1:
                        profileText = _a.sent();
                        link = document.createElement("a");
                        link.href = URL.createObjectURL(new Blob([profileText], { "type": "application/json" }));
                        link.download = "gpuprofile-" + +new Date() + ".speedscope.json";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        return [2 /*return*/];
                }
            });
        });
    };
    WebGLProfiler.prototype.stopAndDownload = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.stop();
                        return [4 /*yield*/, this.downloadWhenReady()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    WebGLProfiler.prototype.markAction = function (action) {
        if (this.ext == null) {
            return;
        }
        if (this.activeQuery == null) {
            throw new Error("Cannot mark actions while no profile is active");
        }
        var oldQuery = this.activeQuery;
        this.activeQuery = this.ext.createQueryEXT();
        this.ext.endQueryEXT(this.ext.TIME_ELAPSED_EXT);
        this.ext.beginQueryEXT(this.ext.TIME_ELAPSED_EXT, this.activeQuery);
        this.eventsPendingTimestamps.push({ action: action, query: oldQuery });
    };
    WebGLProfiler.prototype.resolveEventsIfPossible = function () {
        if (this.ext == null) {
            return;
        }
        var i = 0;
        while (i < this.eventsPendingTimestamps.length) {
            var pendingAction = this.eventsPendingTimestamps[i];
            var query = pendingAction.query;
            if (!this.ext.getQueryObjectEXT(query, this.ext.QUERY_RESULT_AVAILABLE_EXT)) {
                break;
            }
            // I don't totally understand what this means, but apparently if this is true,
            // it means that the GPU timing information is definitely going to unreliable.
            // This is based on this example:
            // https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query/getQueryObjectEXT#Examples
            if (this.context.getParameter(this.ext.GPU_DISJOINT_EXT)) {
                throw new Error("GPU_DISJOINT_EXT");
            }
            var elapsed = this.ext.getQueryObjectEXT(query, this.ext.QUERY_RESULT_EXT);
            // TODO(jlfwong): If the creation & deletion of queries ends up having non-trivial
            // overhead, we could generate a bunch of queries up-front, and then use a free list
            // instead of needing to call createQueryEXT and deleteQueryEXT all the time.
            this.ext.deleteQueryEXT(query);
            var lastTimestamp = this.resolvedEvents.length === 0 ? 0 : this.resolvedEvents[this.resolvedEvents.length - 1].timestamp;
            var timestamp = lastTimestamp + elapsed;
            this.resolvedEvents.push({ action: pendingAction.action, timestamp: timestamp });
            i++;
        }
        if (i > 0) {
            this.eventsPendingTimestamps = this.eventsPendingTimestamps.slice(i);
        }
    };
    // Convert the currently recorded profile into speedscope's
    // file format.
    WebGLProfiler.prototype.toSpeedscopeProfile = function () {
        var frames = [];
        var speedscopeEvents = [];
        if (this.resolvedEvents.length === 0) {
            throw new Error("Profile is empty");
        }
        var profile = {
            "type": SpeedscopeProfileType.EVENTED,
            "name": "GPU Profile",
            "unit": "nanoseconds",
            "startValue": 0,
            "endValue": this.resolvedEvents[this.resolvedEvents.length - 1].timestamp,
            "events": speedscopeEvents
        };
        var file = {
            "$schema": "https://www.Speedscopeapp/file-format-schema.json",
            "shared": {
                "frames": frames,
            },
            "profiles": [profile]
        };
        var frameToIndex = {};
        function getOrInsertFrame(name) {
            if (!(name in frameToIndex)) {
                frameToIndex[name] = frames.length;
                frames.push({
                    "name": name
                });
            }
            return frameToIndex[name];
        }
        for (var _i = 0, _a = this.resolvedEvents; _i < _a.length; _i++) {
            var event_1 = _a[_i];
            speedscopeEvents.push({
                "type": event_1.action.type == GPUProfilerActionType.OPEN_FRAME ? SpeedscopeEventType.OPEN_FRAME : SpeedscopeEventType.CLOSE_FRAME,
                "frame": getOrInsertFrame(event_1.action.name),
                "at": event_1.timestamp
            });
        }
        return JSON.stringify(file);
    };
    return WebGLProfiler;
}());
var GPUProfilerActionType;
(function (GPUProfilerActionType) {
    GPUProfilerActionType[GPUProfilerActionType["OPEN_FRAME"] = 0] = "OPEN_FRAME";
    GPUProfilerActionType[GPUProfilerActionType["CLOSE_FRAME"] = 1] = "CLOSE_FRAME";
})(GPUProfilerActionType || (GPUProfilerActionType = {}));
var SpeedscopeProfileType;
(function (SpeedscopeProfileType) {
    SpeedscopeProfileType["EVENTED"] = "evented";
    SpeedscopeProfileType["SAMPLED"] = "sampled";
})(SpeedscopeProfileType || (SpeedscopeProfileType = {}));
var SpeedscopeEventType;
(function (SpeedscopeEventType) {
    SpeedscopeEventType["OPEN_FRAME"] = "O";
    SpeedscopeEventType["CLOSE_FRAME"] = "C";
})(SpeedscopeEventType || (SpeedscopeEventType = {}));

if (typeof module === "object" && typeof module.exports === "object") {
  module.exports = WebGLProfiler
} else if (typeof window !== 'undefined') {
  window['WebGLProfiler'] = WebGLProfiler
}
})();