
type Direction = "up" | "down";
interface ElevatorRequest { floor: number, direction: Direction }

class ElevatorSystem {
    private elevators: Array<Elevator>;
    maxFloor: number
    constructor(elevators: number, maxFloor: number) {
        this.elevators = []
        for (let i = 0; i < elevators; i++) {
            this.elevators.push(new Elevator(this, i))
        }
        this.maxFloor = maxFloor;
    }

    get elevatorsNumber(): number {
        return this.elevators.length;
    }

    public pushButtonInElevator(elevator: number, button: number) {
        this.elevators.filter(e => e.id == elevator)[0].pushInternalButton(button);
    }

    public pickup(floor: number, dir: number) {
        let direction: Direction = dir >= 0 ? "up" : "down";

        if (this.elevators.some(e => e.externalRequests.some(er => er.floor == floor && er.direction == direction))) {
            console.log("There is already similar request!");
            return;
        }

        if (this.elevators.some(e => e.requestsNumber == 0)) {
            this.elevators
                .filter(e => e.requestsNumber == 0)[0]
                .addExternalRequest({ floor, direction });
            return;
        }

        if (direction == "down") {
            if (this.sendToApproachingFromUp({ floor, direction })) return;
            if (this.sendToApproachingFromBottom({ floor, direction })) return;
        }
        else {
            if (this.sendToApproachingFromBottom({ floor, direction })) return;
            if (this.sendToApproachingFromUp({ floor, direction })) return;
        }

        this.elevators
            .sort((a, b) => a.requestsNumber - b.requestsNumber)[0]
            .addExternalRequest({ floor, direction });
        return;
    }

    private sendToApproachingFromUp(request: ElevatorRequest): boolean {
        if (this.elevators.some(e => e.currentFloor >= request.floor && e.direction == "down")) {
            this.elevators
                .filter(e => e.currentFloor >= request.floor && e.direction == "down")
                .sort((a, b) => a.requestsNumber - b.requestsNumber)[0]
                .addExternalRequest(request);
            return true;
        }
        return false;
    }

    private sendToApproachingFromBottom(request: ElevatorRequest): boolean {
        if (this.elevators.some(e => e.currentFloor <= request.floor && e.direction == "up")) {
            this.elevators
                .filter(e => e.currentFloor <= request.floor && e.direction == "up")
                .sort((a, b) => a.requestsNumber - b.requestsNumber)[0]
                .addExternalRequest(request);
            return true;
        }
        return false;
    }

    public update(elevatorNumber: number, currentFloor: number, targetFloor: number) {
        if (currentFloor > this.maxFloor || currentFloor < 0) {
            throw new RangeError(`Invalid current floor (${currentFloor}) for elevator ${elevatorNumber}`)
        }
        else if (targetFloor > this.maxFloor || targetFloor < 0) {
            throw new RangeError(`Invalid target floor (${targetFloor}) for elevator ${elevatorNumber}`)
        }
        this.elevators.filter(e => e.id == elevatorNumber)[0].currentFloor = currentFloor;
        this.elevators.filter(e => e.id == elevatorNumber)[0].targetFloor = targetFloor;
    }

    public step() {
        this.elevators.forEach(e => e.timeStep())
    }

    public status(): [elevatorID: number, currentFloor: number, targetFloor: number][] {
        return this.elevators.map(e => [e.id, e.currentFloor, e.targetFloor])
    }

    
    public getElevatorExternalRequests(elevatorId: number){
        if(elevatorId >= this.elevatorsNumber) return [];
        return this.elevators.filter(e => e.id == elevatorId)[0].externalRequests;
    }

    public getElevatorInternalRequests(elevatorId: number){
        if(elevatorId >= this.elevatorsNumber) return [];
        return this.elevators.filter(e => e.id == elevatorId)[0].internalRequests;
    }
    public hasElevatorDoorOpen(elevatorId: number){
        if(elevatorId >= this.elevatorsNumber) return false;
        return this.elevators.filter(e => e.id == elevatorId)[0].hasOpenDoor;
    }


}


class Elevator {
    private _system: ElevatorSystem;
    private _prevMove: Direction;

    public internalRequests: Array<ElevatorRequest>;
    public externalRequests: Array<ElevatorRequest>;

    public hasOpenDoor: boolean;

    private _currentFloor: number;
    private _targetFloor: number;
    private _id: number;

    constructor(system: ElevatorSystem, id: number) {
        this._system = system;
        this._id = id;
        this.hasOpenDoor = false;
        this.currentFloor = 0;
        this._targetFloor = undefined;
        this.externalRequests = [];
        this.internalRequests = [];
    }

    public get targetFloor(): number {
        return this._targetFloor;
    }

    public set targetFloor(floor: number) {
        this.targetFloor = floor;
    }

    public get currentFloor(): number {
        return this._currentFloor;
    }

    public set currentFloor(floor: number) {
        this._currentFloor = floor;
    }


    public get id(): number {
        return this._id;
    }

    public get requestsNumber(): number {
        return this.requests.length;
    }

    public get direction(): Direction {
        if (this.targetFloor == undefined) return "up";
        if (this.targetFloor < this.currentFloor) return "down";
        if (this.targetFloor > this.currentFloor) return "up";
        if (this.targetFloor == this.currentFloor) return this._prevMove;
    }

    public get requests(): Array<ElevatorRequest> {
        return [...this.externalRequests, ...this.internalRequests]
    }

    public pushInternalButton(floor: number) {
        this.internalRequests.push({ floor: floor, direction: undefined });
        this.setBestNextTarget();
    }

    public addExternalRequest(request: ElevatorRequest) {
        console.log(request);
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

    private removeCurrentFloorRequests() {
        this.internalRequests = this.internalRequests.filter(request => request.floor != this.currentFloor);
        this.externalRequests = this.externalRequests.filter(request => request.floor != this.currentFloor);
    }

    private setBestNextTarget() {
        this._targetFloor = this.calculateNextTarget();
    }

    private calculateNextTarget(): number {
        if (this._prevMove == "down") {
            let bestTarget = undefined;
            if ((bestTarget = Math.max(...this.requests.map(r => r.floor).filter(el => el <= this.currentFloor))) != -Infinity) {
                return bestTarget;
            }

            if ((bestTarget = Math.min(...this.requests.map(r => r.floor).filter(el => el >= this.currentFloor))) != Infinity) {
                return bestTarget;  //change direction
            }

            if (this.currentFloor == 0) {
                return undefined;
            }

        }
        else {
            let bestTarget = undefined;
            if ((bestTarget = Math.min(...this.requests.map(r => r.floor).filter(el => el >= this.currentFloor))) != Infinity) {
                return bestTarget;
            }

            if ((bestTarget = Math.max(...this.requests.map(r => r.floor).filter(el => el <= this.currentFloor))) != -Infinity) {
                return bestTarget;  //change direction
            }

            if (this.currentFloor == 0) {
                return undefined;
            }

        }
        this.addExternalRequest({ floor: 0, direction: "up" });
        return this.calculateNextTarget();
    }

    private moveOneFloor() {
        if (this._targetFloor == undefined) {
            console.error(`Elevator ${this._id} should not move`);
        }
        if (this.direction == "down") {
            if (this.currentFloor > 0) {
                this.goDown();
                this._prevMove = "down";
            }
            else {
                console.error(`Elevator ${this.id}: direction down on level 0!`)
            }
        } else if (this.direction == "up") {
            if (this.currentFloor < this._system.maxFloor) {
                this.goUp();
                this._prevMove = "up";
            }
            else {
                console.error(`Elevator ${this.id}: direction up on max level!`)
            }
        }
        else console.error("Requested move without given direction!")
    }

    private closeDoor = () => this.hasOpenDoor = false;
    private openDoor = () => this.hasOpenDoor = true;
    private goDown = () => this._currentFloor--;
    private goUp = () => this._currentFloor++;

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
    private colors ={
        buttonsLeft: "#5bc754",
        elevator: "#006699",
        elevatorOpen: "#4dc6ff",
        requestOutside: "#5bc754",
        requestInside: "#c754ac",
        empty: "#c9c9c9",
    }


    public initSystem() {
        let elevators: number = parseInt((document.getElementById("elevatorsNumber") as HTMLInputElement).value);
        let maxFloor: number = parseInt((document.getElementById("floorsNumber") as HTMLInputElement).value);

        if(elevators<=0 || maxFloor <= 0) return;

        let canvas : HTMLCanvasElement= document.querySelector("canvas");
        let newCanvas : HTMLCanvasElement = canvas.cloneNode(true) as HTMLCanvasElement;
        newCanvas.width = (this.config.width+this.config.margin)*elevators+this.config.leftPadding+10;
        newCanvas.height = (this.config.height+this.config.margin)*(maxFloor+1)+10;
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
                if(floor === undefined) return;
                let dir: number = this.getHalfFloorFromClick(y);
                console.log(dir);
                this.makeExternalRequest(floor, dir);
                this.renderAll();
            }
            else {
                let floor: number = this.getFloorFromClick(y);
                if(floor === undefined) return;
                let elevatorID: number = this.getElevatorFromClick(x);
                if(elevatorID === undefined) return;
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

    private renderButtons(){
        for (let floor = this._system.maxFloor; floor >= 0; floor--) {
            let y = this.getCoordinates(0, floor).y;
            this.drawTriangle(this.colors.buttonsLeft, this.config.leftPadding*0.1, y+this.config.height / 12, this.config.leftPadding*0.8, this.config.height / 3, "up");
            this.drawTriangle(this.colors.buttonsLeft, this.config.leftPadding*0.1, y+this.config.height*7 / 12, this.config.leftPadding*0.8, this.config.height / 3, "down");
        }
    }


    private renderElevators() {
        for (let [id, currentFloor, targetFloor] of this._system.status()) {
            let { x, y } = this.getCoordinates(id, currentFloor);
            if(this._system.hasElevatorDoorOpen(id)){
                this.drawRectangle(this.colors.elevatorOpen, x, y);
            }else{
                this.drawRectangle(this.colors.elevator, x, y);
            }
        }
    }

    private renderExternalRequests() {
        for (let elevatorId = 0; elevatorId < this._system.elevatorsNumber; elevatorId++) {
            this._system.getElevatorExternalRequests(elevatorId).forEach(targetFloor => {
                let { x, y } = this.getCoordinates(elevatorId, targetFloor.floor);
                let offset = this.config.height / 24;
                if (targetFloor.direction == "down") {
                    offset = this.config.height / 3
                }
                this.drawTriangle(this.colors.requestOutside, x+this.config.width*0.1, y + offset, this.config.width*0.8, this.config.height / 4, targetFloor.direction);

            })
        }
    }

    private renderInternalRequests() {
        for (let elevatorId = 0; elevatorId < this._system.elevatorsNumber; elevatorId++) {
            this._system.getElevatorInternalRequests(elevatorId).forEach(targetFloor => {
                let { x, y } = this.getCoordinates(elevatorId, targetFloor.floor);
                this.drawRectangle(this.colors.requestInside, x, y + this.config.height * 2 / 3, this.config.width, this.config.height / 3);
            })
        }
    }


    private renderEmptyFloors() {
        for (let elevatorId = 0; elevatorId < this._system.elevatorsNumber; elevatorId++) {
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

    private drawTriangle(color: string, x: number, y: number,width: number = this.config.width, height: number = this.config.height, direction: Direction){
        this._context.beginPath();
        this._context.fillStyle = color;
        if(direction == "down"){
            this._context.moveTo(x,y);
            this._context.lineTo(x+width/2,y+height);
            this._context.lineTo(x+width,y);
            this._context.fill();
        }
        if(direction == "up"){
            this._context.moveTo(x+width/2,y);
            this._context.lineTo(x,y+height);
            this._context.lineTo(x+width,y+height);
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
        if(floor > this._system.maxFloor || floor < 0){ return undefined;}
        return floor;
        
    }
    
    private getHalfFloorFromClick(y: number): number {
        return -(y - (this._system.maxFloor - this.getFloorFromClick(y)) * (this.config.height + this.config.margin) - this.config.height / 2);
    }

    private getElevatorFromClick(x: number): number {
        let elevatorNumber = Math.floor((x - this.config.leftPadding) / (this.config.width + this.config.margin));
        if(elevatorNumber >= this._system.elevatorsNumber || elevatorNumber < 0){
            return undefined;
        }
        return elevatorNumber;
    }

}

let visualizer = new ElevatorSystemVisualizer();
