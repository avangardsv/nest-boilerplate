const ADMIN_USER_ID = '00000000-0000-4000-8000-000000000000';
const ADMIN_USER_EMAIL = 'admin@admin.com';
const ADMIN_USER_PASSWORD = 'admin';
const ADMIN_USER_NAME = 'Admin';

import { v4 as uuidv4 } from 'uuid';

const adminUserData = {
	id: uuidv4(),
	email: 'user@user.com',
	password: 'user',
	name: 'User',
};

const userData = {
	id: uuidv4(),
	email: 'user@user.com',
	password: 'user',
	name: 'User',
};

const user1Data = {
	id: uuidv4(),
	email: 'user1@user.com',
	password: 'user1',
	name: 'User1',
};

const user2Data = {
	id: uuidv4(),
	email: 'user2@user.com',
	password: 'user2',
	name: 'User2',
};

export {
	userData,
	user1Data,
	user2Data,
	adminUserData,
	ADMIN_USER_ID,
	ADMIN_USER_EMAIL,
	ADMIN_USER_PASSWORD,
	ADMIN_USER_NAME,
};
