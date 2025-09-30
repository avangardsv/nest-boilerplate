import { v4 as uuidv4 } from 'uuid';
import { companyData } from './company.constants';
import { userData } from './user.constants';

export const projectData = {
	id: uuidv4(),
	name: 'Project',
	companyId: companyData.id,
	userId: userData.id,
};
