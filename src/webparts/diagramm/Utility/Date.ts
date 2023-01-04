
export class CurrentDate {
    private static month: string;
    private static year: string;
    private static numberToMonth = new Map();

    constructor() {
        this.init()
        const date = new Date().toLocaleDateString("de-DE").split('.');
        const currentMonth = CurrentDate.numberToMonth.get(date[1]);
        const currentYear = date[2];
        CurrentDate.month = currentMonth;
        CurrentDate.year = currentYear;
    }

    private init() {
        CurrentDate.numberToMonth.set("1", "Januar");
        CurrentDate.numberToMonth.set("2", "Februar");
        CurrentDate.numberToMonth.set("3", "März");
        CurrentDate.numberToMonth.set("4", "April");
        CurrentDate.numberToMonth.set("5", "Mai");
        CurrentDate.numberToMonth.set("6", "Juni");
        CurrentDate.numberToMonth.set("7", "Juli");
        CurrentDate.numberToMonth.set("8", "August");
        CurrentDate.numberToMonth.set("9", "September");
        CurrentDate.numberToMonth.set("10", "Oktober");
        CurrentDate.numberToMonth.set("11", "November");
        CurrentDate.numberToMonth.set("12", "Dezember");
    }

    public static getMonth() {
        return this.month;
    }

    public static getYear() {
        return this.year;
    }
}