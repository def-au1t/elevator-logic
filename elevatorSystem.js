var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var ElevatorSystem = /** @class */ (function () {
    function ElevatorSystem(elevators, maxFloor) {
        this.elevators = [];
        for (var i = 0; i < elevators; i++) {
            this.elevators.push(new Elevator(this, i));
        }
        this.maxFloor = maxFloor;
    }
    Object.defineProperty(ElevatorSystem.prototype, "elevatorsCount", {
        get: function () {
            return this.elevators.length;
        },
        enumerable: false,
        configurable: true
    });
    ElevatorSystem.prototype.pushButtonInElevator = function (elevator, button) {
        this.elevators.filter(function (e) { return e.id == elevator; })[0].pushInternalButton(button);
    };
    ElevatorSystem.prototype.pickup = function (floor, dir) {
        var direction = dir >= 0 ? "up" : "down";
        var request = { floor: floor, direction: direction };
        if (this.elevators.some(function (e) { return e.hasAlreadyExternalRequest(request); })) {
            console.log("There is already similar request!");
            return;
        }
        if (this.elevators.some(function (e) { return e.requestsCount == 0; })) {
            this.elevators
                .filter(function (e) { return e.requestsCount == 0; })[0]
                .addExternalRequest({ floor: floor, direction: direction });
            return;
        }
        if (direction == "down") {
            if (this.checkAndSendToApproachingFromUp({ floor: floor, direction: direction }))
                return;
            if (this.checkAndSendToApproachingFromBottom({ floor: floor, direction: direction }))
                return;
        }
        else {
            if (this.checkAndSendToApproachingFromBottom({ floor: floor, direction: direction }))
                return;
            if (this.checkAndSendToApproachingFromUp({ floor: floor, direction: direction }))
                return;
        }
        this.elevators
            .sort(function (a, b) { return a.requestsCount - b.requestsCount; })[0]
            .addExternalRequest({ floor: floor, direction: direction });
    };
    ElevatorSystem.prototype.checkAndSendToApproachingFromUp = function (request) {
        if (this.elevators.some(function (e) { return e.currentFloor >= request.floor && e.direction == "down"; })) {
            this.elevators
                .filter(function (e) { return e.currentFloor >= request.floor && e.direction == "down"; })
                .sort(function (a, b) { return a.requestsCount - b.requestsCount; })[0]
                .addExternalRequest(request);
            return true;
        }
        return false;
    };
    ElevatorSystem.prototype.checkAndSendToApproachingFromBottom = function (request) {
        if (this.elevators.some(function (e) { return e.currentFloor <= request.floor && e.direction == "up"; })) {
            this.elevators
                .filter(function (e) { return e.currentFloor <= request.floor && e.direction == "up"; })
                .sort(function (a, b) { return a.requestsCount - b.requestsCount; })[0]
                .addExternalRequest(request);
            return true;
        }
        return false;
    };
    ElevatorSystem.prototype.update = function (elevatorCount, currentFloor, targetFloor) {
        if (currentFloor > this.maxFloor || currentFloor < 0) {
            throw new RangeError("Invalid current floor (" + currentFloor + ") for elevator " + elevatorCount);
        }
        else if (targetFloor > this.maxFloor || targetFloor < 0) {
            throw new RangeError("Invalid target floor (" + targetFloor + ") for elevator " + elevatorCount);
        }
        this.elevators.filter(function (e) { return e.id == elevatorCount; })[0].currentFloor = currentFloor;
        this.elevators.filter(function (e) { return e.id == elevatorCount; })[0].targetFloor = targetFloor;
    };
    ElevatorSystem.prototype.step = function () {
        this.elevators.forEach(function (e) { return e.timeStep(); });
    };
    ElevatorSystem.prototype.status = function () {
        return this.elevators.map(function (e) { return [e.id, e.currentFloor, e.targetFloor]; });
    };
    ElevatorSystem.prototype.getElevatorExternalRequests = function (elevatorId) {
        if (elevatorId >= this.elevatorsCount)
            return [];
        return this.elevators.filter(function (e) { return e.id == elevatorId; })[0].externalRequests;
    };
    ElevatorSystem.prototype.getElevatorInternalRequests = function (elevatorId) {
        if (elevatorId >= this.elevatorsCount)
            return [];
        return this.elevators.filter(function (e) { return e.id == elevatorId; })[0].internalRequests;
    };
    ElevatorSystem.prototype.hasElevatorDoorOpen = function (elevatorId) {
        if (elevatorId >= this.elevatorsCount)
            return false;
        return this.elevators.filter(function (e) { return e.id == elevatorId; })[0].hasOpenDoor;
    };
    return ElevatorSystem;
}());
var Elevator = /** @class */ (function () {
    function Elevator(system, id) {
        var _this = this;
        this.closeDoor = function () { return _this.hasOpenDoor = false; };
        this.openDoor = function () { return _this.hasOpenDoor = true; };
        this.goDown = function () { return _this._currentFloor--; };
        this.goUp = function () { return _this._currentFloor++; };
        this._system = system;
        this._id = id;
        this.hasOpenDoor = false;
        this.currentFloor = 0;
        this._targetFloor = undefined;
        this.externalRequests = [];
        this.internalRequests = [];
    }
    Object.defineProperty(Elevator.prototype, "targetFloor", {
        get: function () {
            return this._targetFloor;
        },
        set: function (floor) {
            this.targetFloor = floor;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Elevator.prototype, "currentFloor", {
        get: function () {
            return this._currentFloor;
        },
        set: function (floor) {
            this._currentFloor = floor;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Elevator.prototype, "id", {
        get: function () {
            return this._id;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Elevator.prototype, "requestsCount", {
        get: function () {
            return this.requests.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Elevator.prototype, "direction", {
        get: function () {
            if (this.targetFloor == undefined)
                return "up";
            if (this.targetFloor < this.currentFloor)
                return "down";
            if (this.targetFloor > this.currentFloor)
                return "up";
            if (this.targetFloor == this.currentFloor)
                return this._prevMove;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Elevator.prototype, "requests", {
        get: function () {
            return __spreadArray(__spreadArray([], this.externalRequests), this.internalRequests);
        },
        enumerable: false,
        configurable: true
    });
    Elevator.prototype.pushInternalButton = function (floor) {
        this.internalRequests.push({ floor: floor, direction: undefined });
        this.setBestNextTarget();
    };
    Elevator.prototype.addExternalRequest = function (request) {
        this.externalRequests.push(request);
        this.setBestNextTarget();
    };
    Elevator.prototype.timeStep = function () {
        if (!this.hasOpenDoor) {
            this.setBestNextTarget();
            if (this.targetFloor == undefined) {
                return;
            }
            if (this.currentFloor == this.targetFloor) {
                this.openDoor();
                this.removeCurrentFloorRequests();
            }
            else {
                this.moveOneFloor();
            }
        }
        else {
            this.removeCurrentFloorRequests();
            this.closeDoor();
        }
    };
    Elevator.prototype.hasAlreadyExternalRequest = function (request) {
        return this.externalRequests.some(function (er) { return er.floor == request.floor && er.direction == request.direction; });
    };
    Elevator.prototype.removeCurrentFloorRequests = function () {
        var _this = this;
        this.internalRequests = this.internalRequests.filter(function (request) { return request.floor != _this.currentFloor; });
        this.externalRequests = this.externalRequests.filter(function (request) { return request.floor != _this.currentFloor; });
    };
    Elevator.prototype.setBestNextTarget = function () {
        this._targetFloor = this.calculateNextTarget();
    };
    Elevator.prototype.calculateNextTarget = function () {
        var _this = this;
        if (this._prevMove == "down") {
            var bestTarget = undefined;
            if (isFinite(bestTarget = Math.max.apply(Math, this.requests.map(function (r) { return r.floor; }).filter(function (el) { return el <= _this.currentFloor; })))) {
                return bestTarget;
            }
            if (isFinite(bestTarget = Math.min.apply(Math, this.requests.map(function (r) { return r.floor; }).filter(function (el) { return el >= _this.currentFloor; })))) {
                return bestTarget; //change direction
            }
            if (this.currentFloor == 0) {
                return undefined;
            }
        }
        else {
            var bestTarget = undefined;
            if (isFinite(bestTarget = Math.min.apply(Math, this.requests.map(function (r) { return r.floor; }).filter(function (el) { return el >= _this.currentFloor; })))) {
                return bestTarget;
            }
            if (isFinite(bestTarget = Math.max.apply(Math, this.requests.map(function (r) { return r.floor; }).filter(function (el) { return el <= _this.currentFloor; })))) {
                return bestTarget; //change direction
            }
            if (this.currentFloor == 0) {
                return undefined;
            }
        }
        this.addExternalRequest({ floor: 0, direction: "up" });
        return this.calculateNextTarget();
    };
    Elevator.prototype.moveOneFloor = function () {
        if (this._targetFloor == undefined) {
            console.error("Elevator " + this._id + " should not move");
        }
        if (this.direction == "down") {
            if (this.currentFloor > 0) {
                this.goDown();
                this._prevMove = "down";
            }
            else {
                console.error("Elevator " + this.id + ": direction down on level 0!");
            }
        }
        else if (this.direction == "up") {
            if (this.currentFloor < this._system.maxFloor) {
                this.goUp();
                this._prevMove = "up";
            }
            else {
                console.error("Elevator " + this.id + ": direction up on max level!");
            }
        }
        else
            console.error("Requested move without given direction!");
    };
    return Elevator;
}());
var ElevatorSystemVisualizer = /** @class */ (function () {
    function ElevatorSystemVisualizer() {
        this.config = {
            width: 40,
            height: 60,
            margin: 10,
            leftPadding: 45,
        };
        this.colors = {
            buttonsLeft: "#5bc754",
            elevator: "#006699",
            elevatorOpen: "#4dc6ff",
            requestOutside: "#5bc754",
            requestInside: "#c754ac",
            empty: "#c9c9c9",
        };
    }
    ElevatorSystemVisualizer.prototype.initSystem = function () {
        var elevators = parseInt(document.getElementById("elevatorsCount").value);
        var maxFloor = parseInt(document.getElementById("floorsCount").value);
        if (elevators <= 0 || maxFloor <= 0)
            return;
        var canvas = document.querySelector("canvas");
        var newCanvas = canvas.cloneNode(true);
        newCanvas.width = (this.config.width + this.config.margin) * elevators + this.config.leftPadding + 10;
        newCanvas.height = (this.config.height + this.config.margin) * (maxFloor + 1) + 10;
        canvas.parentNode.replaceChild(newCanvas, canvas);
        this._canvas = newCanvas;
        this._context = this._canvas.getContext("2d");
        this._system = new ElevatorSystem(elevators, maxFloor);
        this.addElevatorRequestListener();
        this.renderAll();
        document.getElementById("step").style.setProperty("display", "block");
        document.getElementById("header-h2").style.setProperty("display", "none");
        document.getElementById("header-h5").style.setProperty("display", "none");
    };
    ElevatorSystemVisualizer.prototype.addElevatorRequestListener = function () {
        var _this = this;
        this._canvas.addEventListener("mousedown", function (event) {
            var _a = _this.getMousePosition(event), x = _a.x, y = _a.y;
            if (x < _this.config.leftPadding) {
                var floor = _this.getFloorFromClick(y);
                if (floor === undefined)
                    return;
                var dir = _this.getHalfFloorFromClick(y);
                _this.makeExternalRequest(floor, dir);
                _this.renderAll();
            }
            else {
                var floor = _this.getFloorFromClick(y);
                if (floor === undefined)
                    return;
                var elevatorID = _this.getElevatorFromClick(x);
                if (elevatorID === undefined)
                    return;
                _this.makeInternalRequest(elevatorID, floor);
                _this.renderAll();
            }
        });
    };
    ElevatorSystemVisualizer.prototype.nextFrame = function () {
        this._system.step();
        this.renderAll();
    };
    ElevatorSystemVisualizer.prototype.makeExternalRequest = function (floor, direction) {
        this._system.pickup(floor, direction);
    };
    ElevatorSystemVisualizer.prototype.makeInternalRequest = function (elevatorID, floor) {
        this._system.pushButtonInElevator(elevatorID, floor);
    };
    ElevatorSystemVisualizer.prototype.renderAll = function () {
        this.clear();
        this.renderEmptyFloors();
        this.renderElevators();
        this.renderExternalRequests();
        this.renderInternalRequests();
        this.renderButtons();
    };
    ElevatorSystemVisualizer.prototype.renderButtons = function () {
        for (var floor = this._system.maxFloor; floor >= 0; floor--) {
            var y = this.getCoordinates(0, floor).y;
            this.drawTriangle(this.colors.buttonsLeft, this.config.leftPadding * 0.1, y + this.config.height / 12, this.config.leftPadding * 0.8, this.config.height / 3, "up");
            this.drawTriangle(this.colors.buttonsLeft, this.config.leftPadding * 0.1, y + this.config.height * 7 / 12, this.config.leftPadding * 0.8, this.config.height / 3, "down");
        }
    };
    ElevatorSystemVisualizer.prototype.renderElevators = function () {
        for (var _i = 0, _a = this._system.status(); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], currentFloor = _b[1], targetFloor = _b[2];
            var _c = this.getCoordinates(id, currentFloor), x = _c.x, y = _c.y;
            if (this._system.hasElevatorDoorOpen(id)) {
                this.drawRectangle(this.colors.elevatorOpen, x, y);
            }
            else {
                this.drawRectangle(this.colors.elevator, x, y);
            }
        }
    };
    ElevatorSystemVisualizer.prototype.renderExternalRequests = function () {
        var _this = this;
        var _loop_1 = function (elevatorId) {
            this_1._system.getElevatorExternalRequests(elevatorId).forEach(function (targetFloor) {
                var _a = _this.getCoordinates(elevatorId, targetFloor.floor), x = _a.x, y = _a.y;
                var offset = _this.config.height / 24;
                if (targetFloor.direction == "down") {
                    offset = _this.config.height / 3;
                }
                _this.drawTriangle(_this.colors.requestOutside, x + _this.config.width * 0.1, y + offset, _this.config.width * 0.8, _this.config.height / 4, targetFloor.direction);
            });
        };
        var this_1 = this;
        for (var elevatorId = 0; elevatorId < this._system.elevatorsCount; elevatorId++) {
            _loop_1(elevatorId);
        }
    };
    ElevatorSystemVisualizer.prototype.renderInternalRequests = function () {
        var _this = this;
        var _loop_2 = function (elevatorId) {
            this_2._system.getElevatorInternalRequests(elevatorId).forEach(function (targetFloor) {
                var _a = _this.getCoordinates(elevatorId, targetFloor.floor), x = _a.x, y = _a.y;
                _this.drawRectangle(_this.colors.requestInside, x, y + _this.config.height * 2 / 3, _this.config.width, _this.config.height / 3);
            });
        };
        var this_2 = this;
        for (var elevatorId = 0; elevatorId < this._system.elevatorsCount; elevatorId++) {
            _loop_2(elevatorId);
        }
    };
    ElevatorSystemVisualizer.prototype.renderEmptyFloors = function () {
        for (var elevatorId = 0; elevatorId < this._system.elevatorsCount; elevatorId++) {
            for (var floor = this._system.maxFloor; floor >= 0; floor--) {
                var _a = this.getCoordinates(elevatorId, floor), x = _a.x, y = _a.y;
                this.drawRectangle(this.colors.empty, x, y);
            }
        }
    };
    ElevatorSystemVisualizer.prototype.clear = function () {
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
    };
    ElevatorSystemVisualizer.prototype.getCoordinates = function (elevatorId, floor) {
        var x = elevatorId * (this.config.width + this.config.margin) + this.config.leftPadding;
        var y = (this._system.maxFloor - floor) * (this.config.height + this.config.margin);
        return { x: x, y: y };
    };
    ElevatorSystemVisualizer.prototype.drawRectangle = function (color, x, y, width, height) {
        if (width === void 0) { width = this.config.width; }
        if (height === void 0) { height = this.config.height; }
        this._context.fillStyle = color;
        this._context.fillRect(x, y, width, height);
    };
    ElevatorSystemVisualizer.prototype.drawTriangle = function (color, x, y, width, height, direction) {
        if (width === void 0) { width = this.config.width; }
        if (height === void 0) { height = this.config.height; }
        this._context.beginPath();
        this._context.fillStyle = color;
        if (direction == "down") {
            this._context.moveTo(x, y);
            this._context.lineTo(x + width / 2, y + height);
            this._context.lineTo(x + width, y);
            this._context.fill();
        }
        if (direction == "up") {
            this._context.moveTo(x + width / 2, y);
            this._context.lineTo(x, y + height);
            this._context.lineTo(x + width, y + height);
            this._context.fill();
        }
    };
    ElevatorSystemVisualizer.prototype.getMousePosition = function (event) {
        var rect = this._canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        return { x: x, y: y };
    };
    ElevatorSystemVisualizer.prototype.getFloorFromClick = function (y) {
        var floor = this._system.maxFloor - Math.floor(y / (this.config.height + this.config.margin));
        if (floor > this._system.maxFloor || floor < 0) {
            return undefined;
        }
        return floor;
    };
    ElevatorSystemVisualizer.prototype.getHalfFloorFromClick = function (y) {
        return -(y - (this._system.maxFloor - this.getFloorFromClick(y)) * (this.config.height + this.config.margin) - this.config.height / 2);
    };
    ElevatorSystemVisualizer.prototype.getElevatorFromClick = function (x) {
        var elevatorCount = Math.floor((x - this.config.leftPadding) / (this.config.width + this.config.margin));
        if (elevatorCount >= this._system.elevatorsCount || elevatorCount < 0) {
            return undefined;
        }
        return elevatorCount;
    };
    return ElevatorSystemVisualizer;
}());
var visualizer = new ElevatorSystemVisualizer();
//# sourceMappingURL=elevatorSystem.js.map