import { createContext } from 'react';

export const CounterContext = createContext({ 
    counter: 0, 
    increment(){}
});

