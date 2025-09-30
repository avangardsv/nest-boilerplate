import { v4 as uuidv4 } from 'uuid';

export const inProgress = {
    id: uuidv4(),
    name: 'In Progress',
};

export const completed = {
    id: uuidv4(),
    name: 'Completed',
};

export const todo = {
    id: uuidv4(),
    name: 'Todo',
};