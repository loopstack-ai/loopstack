class Manager {
    private _value: number;
    constructor(props: { value: number }) {
        this._value = props.value;
    }
    get value() {
        return this._value;
    }
    set value(newValue: number) {
        this._value = newValue;
    }
}

const someAsyncFunction = async (manager: Manager): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    manager.value = 2;
}

async function myFunction() {
    const manager = new Manager({ value: 1 });

    await someAsyncFunction(manager);

    console.log(manager.value); // 2
}

myFunction();
