export interface IInstitute {
  _id: string;
  instituteName: string;
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudent {
  _id: string;
  name: string;
  email: string;
  nanoId: string[];
  createdAt: Date;
  updatedAt: Date;
}
