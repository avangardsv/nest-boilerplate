import { v4 as uuidv4 } from 'uuid';
import { ADMIN_USER_ID, user1Data, userData, user2Data } from './user.constants';

export const adminCompanyData = {
    id: uuidv4(),
    name: 'Company',
    ownerId: ADMIN_USER_ID,
};

export const companyData =  {
    id: uuidv4(),
    name: 'Company1',
    ownerId: userData.id,
};

export const company1Data =  {
    id: uuidv4(),
    name: 'Company1',
    ownerId: userData.id,
};

export const company2Data =  {
    id: uuidv4(),
    name: 'Company2',
    ownerId: user1Data.id,
};

export const company3Data =  {
    id: uuidv4(),
    name: 'Company3',
    ownerId: user2Data.id,
};