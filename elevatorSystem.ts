class ElevatorSystem {
    private elevators: Array<Elevator>;
    maxFloor: number
    constructor(elevators: number, maxFloor: number) {
        this.elevators = []
        for (let i = 0; i < elevators; i++) {
            this.elevators.push(new Elevator(this, i))
            console.log(this.elevators.length)
        }
        this.maxFloor = maxFloor;
    }

    pushButtonInElevator(elevator: number, button: number){
        this.elevators[elevator].pushInternalButton(button);
    }

    pickup(floor: number, direction: number) { 
        if (this.elevators.some(e => e.requestsNumber == 0)){
            this.elevators
            .filter(e => e.requestsNumber == 0)[0]
            .addExternalRequest(floor);
            return;
        }

        if(direction < 0){  //Down
            if(this.sendToApproachingFromUp(floor)) return;
            if(this.sendToApproachingFromBottom(floor)) return;
        }
        else{
            if(this.sendToApproachingFromBottom(floor)) return;
            if(this.sendToApproachingFromUp(floor)) return;
        }

        this.elevators
        .sort((a, b) => a.requestsNumber - b.requestsNumber)[0]
        .addExternalRequest(floor);
        return;
    }

    private sendToApproachingFromUp(floor): boolean{
        if (this.elevators.some(e => e.currentFloor >= floor && e.direction == "down")){
            this.elevators
            .filter(e => e.currentFloor >= floor && e.direction == "down")
            .sort((a, b) => a.requestsNumber - b.requestsNumber)[0]
            .addExternalRequest(floor);
            return true;
        }
        return false;
    }

    private sendToApproachingFromBottom(floor): boolean{
        if (this.elevators.some(e => e.currentFloor <= floor && e.direction == "up")){
            this.elevators
            .filter(e => e.currentFloor <= floor && e.direction == "up")
            .sort((a, b) => a.requestsNumber - b.requestsNumber)[0]
            .addExternalRequest(floor);
            return true;
        }
        return false;
    }

    update(elevatorNumber: number, currentFloor: number, targetFloor: number) {
        if (currentFloor > this.maxFloor || currentFloor < 0) {
            throw new RangeError(`Invalid current floor (${currentFloor}) for elevator ${elevatorNumber}`)
        }
        else if (targetFloor > this.maxFloor || targetFloor < 0) {
            throw new RangeError(`Invalid target floor (${targetFloor}) for elevator ${elevatorNumber}`)
        }
        this.elevators[elevatorNumber].currentFloor = currentFloor;
        this.elevators[elevatorNumber].targetFloor = targetFloor;
    }

    step() { 
        this.elevators.forEach(e => e.timeStep())
    }

    status(): [elevatorID: number, currentFloor: number, targetFloor: number][] {
        return this.elevators.map(e => [e.id, e.currentFloor, e.targetFloor])
    }


}

type Direction = "up" | "down";

class Elevator {
    private _system: ElevatorSystem;
    private _direction: Direction;

    internalRequests: Array<number>;
    externalRequests: Array<number>;

    hasOpenDoor: boolean;

    private _currentFloor: number;
    private _targetFloor: number;
    private _id: number;

    constructor(system: ElevatorSystem, id: number) {
        this._system = system;
        this._id = id;
        this._direction = "up";
        this.hasOpenDoor = true;
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
        if(this.targetFloor == undefined) return "up";
        if(this.targetFloor < this.currentFloor) return "down";
        else if(this.targetFloor > this.currentFloor) return "up";
    }

    public get requests() : Array<number>{
        return [...this.externalRequests, ...this.internalRequests]
    }

    public pushInternalButton(floor: number){
        this.internalRequests.push(floor);
        this.calculateNextTarget();
    }

    public addExternalRequest(floor: number){
        this.externalRequests.push(floor);
        this.calculateNextTarget();
    }

    public timeStep() {
        if(!this.hasOpenDoor){
            this._targetFloor = this.calculateNextTarget();
            if(this.currentFloor == this.targetFloor){
                this.openDoor()
                this.removeCurrentFloorRequests();
            }
            else{
                this.moveOneFloor();
            }
        }
        else{
            this.removeCurrentFloorRequests();
            this.closeDoor();
        }
    }

    private removeCurrentFloorRequests(){
        this.internalRequests = this.internalRequests.filter(button => button != this.currentFloor);
        this.externalRequests = this.externalRequests.filter(floor => floor != this.currentFloor);
    }

    private calculateNextTarget(): number {
        if(this.direction == "down"){
            let bestTarget = undefined;
            if((bestTarget = Math.max(...this.requests.filter(el => el <= this.currentFloor))) != -Infinity){
                return bestTarget;
            }
            
            if((bestTarget = Math.min(...this.requests.filter(el => el >= this.currentFloor))) != Infinity){
                return bestTarget;  //change direction
            }
            
            if(this.currentFloor == 0){
                return undefined;
            }
            else{
                this.addExternalRequest(0);
                return this.calculateNextTarget();
            }

        }
        else{
            let bestTarget = undefined;
            if((bestTarget = Math.min(...this.requests.filter(el => el >= this.currentFloor))) != Infinity){
                return bestTarget;
            }
            
            if((bestTarget = Math.max(...this.requests.filter(el => el <= this.currentFloor))) != -Infinity){
                return bestTarget;  //change direction
            }
            
            if(this.currentFloor == 0){
                return undefined;
            }

            this.addExternalRequest(0);
            return this.calculateNextTarget();

        }
    }

    private moveOneFloor(){
        if (this.direction == "down") {
            if (this.currentFloor > 0) {
                this.goDown();
            }
            else {
                console.error(`Elevator ${this.id}: direction down on level 0!`)
            }
        } else if (this.direction == "up") {
            if (this.currentFloor < this._system.maxFloor) {
                this.goUp();
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
let skyscraper = new ElevatorSystem(12, 10);