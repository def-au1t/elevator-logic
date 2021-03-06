
type Direction = "up" | "down";
interface ElevatorRequest { floor: number, direction: Direction }

class ElevatorSystem {
    private elevators: Array<Elevator>;
    maxFloor: number;
    constructor(elevators: number, maxFloor: number) {
        this.elevators = [];
        for (let i = 0; i < elevators; i++) {
            this.elevators.push(new Elevator(this, i));
        }
        this.maxFloor = maxFloor;
    }

    get elevatorsCount(): number {
        return this.elevators.length;
    }

    public pushButtonInElevator(elevator: number, button: number) {
        this.elevators.find(e => e.id == elevator).pushInternalButton(button);
    }

    public pickup(floor: number, dir: number): void {
        let direction: Direction = dir >= 0 ? "up" : "down";
        let request: ElevatorRequest = { floor, direction };

        if (this.elevators.some(e => e.hasExternalRequest(request))) {
            console.log("There is already similar request!");
            return;
        }

        if (this.elevators.some(e => e.requestsCount == 0)) {
            this.elevators
                .find(e => e.requestsCount == 0)
                .addExternalRequest({ floor, direction });
            return;
        }

        if (direction == "down") {
            if (this.checkAndSendToApproachingFromUp({ floor, direction })) return;
            if (this.checkAndSendToApproachingFromBottom({ floor, direction })) return;
        }
        else {
            if (this.checkAndSendToApproachingFromBottom({ floor, direction })) return;
            if (this.checkAndSendToApproachingFromUp({ floor, direction })) return;
        }

        this.elevators
            .sort((a, b) => a.requestsCount - b.requestsCount)[0]
            .addExternalRequest({ floor, direction });
    }

    private checkAndSendToApproachingFromUp(request: ElevatorRequest): boolean {
        if (this.elevators.some(e => e.currentFloor >= request.floor && e.direction == "down")) {
            this.elevators
                .filter(e => e.currentFloor >= request.floor && e.direction == "down")
                .sort((a, b) => a.requestsCount - b.requestsCount)[0]
                .addExternalRequest(request);
            return true;
        }
        return false;
    }

    private checkAndSendToApproachingFromBottom(request: ElevatorRequest): boolean {
        if (this.elevators.some(e => e.currentFloor <= request.floor && e.direction == "up")) {
            this.elevators
                .filter(e => e.currentFloor <= request.floor && e.direction == "up")
                .sort((a, b) => a.requestsCount - b.requestsCount)[0]
                .addExternalRequest(request);
            return true;
        }
        return false;
    }

    public update(elevatorId: number, currentFloor: number, targetFloor: number): void {
        if (currentFloor > this.maxFloor || currentFloor < 0) {
            throw new RangeError(`Invalid current floor (${currentFloor}) for elevator ${elevatorId}`);
        }
        else if (targetFloor > this.maxFloor || targetFloor < 0) {
            throw new RangeError(`Invalid target floor (${targetFloor}) for elevator ${elevatorId}`);
        }
        this.elevators.find(e => e.id == elevatorId).currentFloor = currentFloor;
        this.elevators.find(e => e.id == elevatorId).targetFloor = targetFloor;
    }

    public step(): void {
        this.elevators.forEach(e => e.timeStep());
    }

    public status(): Array<[elevatorID: number, currentFloor: number, targetFloor: number]> {
        return this.elevators.map(e => [e.id, e.currentFloor, e.targetFloor]);
    }


    public getElevatorExternalRequests(elevatorId: number): Array<ElevatorRequest> {
        if (elevatorId >= this.elevatorsCount) {
            throw new RangeError(`Invalid elevatorId: ${elevatorId}`);
        }
        return this.elevators.find(e => e.id == elevatorId).externalRequests;
    }

    public getElevatorInternalRequests(elevatorId: number): Array<ElevatorRequest> {
        if (elevatorId >= this.elevatorsCount) {
            throw new RangeError(`Invalid elevatorId: ${elevatorId}`);
        }
        return this.elevators.find(e => e.id == elevatorId).internalRequests;
    }

    public isDoorOpen(elevatorId: number): boolean {
        if (elevatorId >= this.elevatorsCount) {
            throw new RangeError(`Invalid elevatorId: ${elevatorId}`);
        }
        return this.elevators.find(e => e.id == elevatorId).hasOpenDoor;
    }
}


class Elevator {
    private _system: ElevatorSystem;
    private _previousDirection: Direction;

    public internalRequests: Array<ElevatorRequest>;
    public externalRequests: Array<ElevatorRequest>;

    public hasOpenDoor: boolean;

    public currentFloor: number;
    public targetFloor: number;
    private _id: number;

    constructor(system: ElevatorSystem, id: number) {
        this._system = system;
        this._id = id;
        this.hasOpenDoor = false;
        this.currentFloor = 0;
        this.targetFloor = undefined;
        this.externalRequests = [];
        this.internalRequests = [];
    }

    public get id(): number {
        return this._id;
    }

    public get requestsCount(): number {
        return this.requests.length;
    }

    public get direction(): Direction {
        if (this.targetFloor == undefined) return "up";
        if (this.targetFloor < this.currentFloor) return "down";
        if (this.targetFloor > this.currentFloor) return "up";
        if (this.targetFloor == this.currentFloor) return this._previousDirection;
    }

    public get requests(): Array<ElevatorRequest> {
        return [...this.externalRequests, ...this.internalRequests];
    }

    public pushInternalButton(floor: number) {
        this.internalRequests.push({ floor: floor, direction: undefined });
        this.setBestNextTarget();
    }

    public addExternalRequest(request: ElevatorRequest) {
        this.externalRequests.push(request);
        this.setBestNextTarget();
    }


    public timeStep() {
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
    }

    public hasExternalRequest(request: ElevatorRequest): boolean {
        return this.externalRequests.some(er => er.floor == request.floor && er.direction == request.direction);
    }

    private removeCurrentFloorRequests() {
        this.internalRequests = this.internalRequests.filter(request => request.floor != this.currentFloor);
        this.externalRequests = this.externalRequests.filter(request => request.floor != this.currentFloor);
    }

    private setBestNextTarget() {
        this.targetFloor = this.calculateNextTarget();
    }

    private calculateNextTarget(): number {
        if (this._previousDirection == "down") {
            let bestTarget = undefined;
            if (isFinite(bestTarget = Math.max(...this.requests.map(r => r.floor).filter(el => el <= this.currentFloor)))) {
                return bestTarget;
            }

            if (isFinite(bestTarget = Math.min(...this.requests.map(r => r.floor).filter(el => el >= this.currentFloor)))) {
                return bestTarget;  // elevator changes its direction
            }
        }
        else {
            let bestTarget = undefined;
            if (isFinite(bestTarget = Math.min(...this.requests.map(r => r.floor).filter(el => el >= this.currentFloor)))) {
                return bestTarget;
            }

            if (isFinite(bestTarget = Math.max(...this.requests.map(r => r.floor).filter(el => el <= this.currentFloor)))) {
                return bestTarget;  // elevator changes its direction
            }
        }

        if (this.currentFloor == 0) {
            return undefined;
        }

        this.addExternalRequest({ floor: 0, direction: "up" });
        return 0;
    }

    private moveOneFloor() {
        if (this.targetFloor == undefined) {
            console.error(`Elevator ${this._id} should not move`);
            return;
        }
        if (this.direction == "down") {
            if (this.currentFloor > 0) {
                this.goDown();
                this._previousDirection = "down";
            }
            else {
                console.error(`Elevator ${this.id}: direction down on level 0!`);
            }
        } else if (this.direction == "up") {
            if (this.currentFloor < this._system.maxFloor) {
                this.goUp();
                this._previousDirection = "up";
            }
            else {
                console.error(`Elevator ${this.id}: direction up on max level!`);
            }
        }
        else console.error("Requested move without given direction!");
    }

    private closeDoor = () => this.hasOpenDoor = false;
    private openDoor = () => this.hasOpenDoor = true;
    private goDown = () => this.currentFloor--;
    private goUp = () => this.currentFloor++;

}

class ElevatorSystemVisualizer {
    private _canvas: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;
    private _system: ElevatorSystem;
    private config = {
        width: 40,
        height: 60,
        margin: 10,
        leftPadding: 45,
    }
    private colors = {
        buttonsLeft: "#5bc754",
        elevator: "#006699",
        elevatorOpen: "#4dc6ff",
        requestOutside: "#5bc754",
        requestInside: "#c754ac",
        empty: "#c9c9c9",
    }


    public initSystem() {
        let elevators: number = parseInt((document.getElementById("elevatorsCount") as HTMLInputElement).value);
        let maxFloor: number = parseInt((document.getElementById("floorsCount") as HTMLInputElement).value);

        if (elevators <= 0 || maxFloor <= 0) return;

        let canvas: HTMLCanvasElement = document.querySelector("canvas");
        let newCanvas: HTMLCanvasElement = canvas.cloneNode(true) as HTMLCanvasElement;
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

    }

    private addElevatorRequestListener() {
        this._canvas.addEventListener("mousedown", (event) => {
            let { x, y } = this.getMousePosition(event);
            if (x < this.config.leftPadding) {
                let floor: number = this.getFloorFromClick(y);
                if (floor === undefined) return;
                let dir: number = this.getHalfFloorFromClick(y);
                this.makeExternalRequest(floor, dir);
                this.renderAll();
            }
            else {
                let floor: number = this.getFloorFromClick(y);
                if (floor === undefined) return;
                let elevatorID: number = this.getElevatorFromClick(x);
                if (elevatorID === undefined) return;
                this.makeInternalRequest(elevatorID, floor);
                this.renderAll();
            }
        }
        )
    }

    public nextFrame() {
        this._system.step();
        this.renderAll();
    }

    public makeExternalRequest(floor: number, direction: number) {
        this._system.pickup(floor, direction);
    }

    public makeInternalRequest(elevatorID: number, floor: number) {
        this._system.pushButtonInElevator(elevatorID, floor);
    }

    private renderAll() {
        this.clear();
        this.renderEmptyFloors();
        this.renderElevators();
        this.renderExternalRequests();
        this.renderInternalRequests();
        this.renderButtons();
    }

    private renderButtons() {
        for (let floor = this._system.maxFloor; floor >= 0; floor--) {
            let y = this.getCoordinates(0, floor).y;
            this.drawTriangle(this.colors.buttonsLeft, this.config.leftPadding * 0.1, y + this.config.height / 12, this.config.leftPadding * 0.8, this.config.height / 3, "up");
            this.drawTriangle(this.colors.buttonsLeft, this.config.leftPadding * 0.1, y + this.config.height * 7 / 12, this.config.leftPadding * 0.8, this.config.height / 3, "down");
        }
    }


    private renderElevators() {
        for (let [id, currentFloor, targetFloor] of this._system.status()) {
            let { x, y } = this.getCoordinates(id, currentFloor);
            if (this._system.isDoorOpen(id)) {
                this.drawRectangle(this.colors.elevatorOpen, x, y);
            } else {
                this.drawRectangle(this.colors.elevator, x, y);
            }
        }
    }

    private renderExternalRequests() {
        for (let elevatorId = 0; elevatorId < this._system.elevatorsCount; elevatorId++) {
            this._system.getElevatorExternalRequests(elevatorId).forEach(targetFloor => {
                let { x, y } = this.getCoordinates(elevatorId, targetFloor.floor);
                let offset = this.config.height / 24;
                if (targetFloor.direction == "down") {
                    offset = this.config.height / 3;
                }
                this.drawTriangle(this.colors.requestOutside, x + this.config.width * 0.1, y + offset, this.config.width * 0.8, this.config.height / 4, targetFloor.direction);

            })
        }
    }

    private renderInternalRequests() {
        for (let elevatorId = 0; elevatorId < this._system.elevatorsCount; elevatorId++) {
            this._system.getElevatorInternalRequests(elevatorId).forEach(targetFloor => {
                let { x, y } = this.getCoordinates(elevatorId, targetFloor.floor);
                this.drawRectangle(this.colors.requestInside, x, y + this.config.height * 2 / 3, this.config.width, this.config.height / 3);
            })
        }
    }


    private renderEmptyFloors() {
        for (let elevatorId = 0; elevatorId < this._system.elevatorsCount; elevatorId++) {
            for (let floor = this._system.maxFloor; floor >= 0; floor--) {
                let { x, y } = this.getCoordinates(elevatorId, floor);
                this.drawRectangle(this.colors.empty, x, y);
            }
        }
    }

    private clear() {
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }


    private getCoordinates(elevatorId: number, floor: number): { x: number, y: number } {
        let x = elevatorId * (this.config.width + this.config.margin) + this.config.leftPadding;
        let y = (this._system.maxFloor - floor) * (this.config.height + this.config.margin);
        return { x, y };
    }

    private drawRectangle(color: string, x: number, y: number, width: number = this.config.width, height: number = this.config.height) {
        this._context.fillStyle = color;
        this._context.fillRect(x, y, width, height);
    }

    private drawTriangle(color: string, x: number, y: number, width: number = this.config.width, height: number = this.config.height, direction: Direction) {
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

    }

    private getMousePosition(event): { x: number, y: number } {
        let rect: DOMRect = this._canvas.getBoundingClientRect();
        let x: number = event.clientX - rect.left;
        let y: number = event.clientY - rect.top;
        return { x, y }
    }

    private getFloorFromClick(y: number): number {
        let floor = this._system.maxFloor - Math.floor(y / (this.config.height + this.config.margin));
        if (floor > this._system.maxFloor || floor < 0) { return undefined; }
        return floor;

    }

    private getHalfFloorFromClick(y: number): number {
        return -(y - (this._system.maxFloor - this.getFloorFromClick(y)) * (this.config.height + this.config.margin) - this.config.height / 2);
    }

    private getElevatorFromClick(x: number): number {
        let elevatorCount = Math.floor((x - this.config.leftPadding) / (this.config.width + this.config.margin));
        if (elevatorCount >= this._system.elevatorsCount || elevatorCount < 0) {
            return undefined;
        }
        return elevatorCount;
    }

}

let visualizer = new ElevatorSystemVisualizer();
