interface User {
    _id: string,
    username: string,
    email: string,
    role:"user" | "admin",
    password: string
}

interface NewUserData extends Omit<User, "_id"> {}


const createUser = async({username,email,password, role}:NewUserData): Promise<User>=>{
    const user = {username,email,password};
    const result : User = {...user,_id:"sdfhsdkfsdjkj",role}; // aquí vendría la llamada a mongoose
    // const result = await UserModel.create(user);
    return result;
}

const getUserByEmail = async(email:string): Promise<User | null>=>{
    // const result = await UserModel.findOne({email});
    const result : User | null = {email:email,_id:"sdfhsdkfsdjkj",username:"pepe",password:"1234", role:"admin"}; // aquí vendría la llamada a mongoose
    return result;
}

export {createUser,getUserByEmail,type User,type NewUserData};