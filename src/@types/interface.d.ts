interface IPropsOfComponent {
    className?: string;
    children?: ReactNode | string;
    [key: string]: any;
}

interface IOption {
    id: number;
    label: string;
    value: string;
}
interface IToken {
    id: string;
    name: string;
    image: string;
    address?: string;
    decimal:number
}


