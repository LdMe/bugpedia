import {createUser,getUserByEmail, type User} from "../repositories/auth.repository.ts";
import type{Request,Response} from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

interface UserRegisterBody extends Omit<User,"role"|"_id"> {
    passwordRepeat:string
}
interface UserLoginBody extends Omit<User, "_id"|"username"|"role">{}
const login = async (req:Request,res:Response):Promise<void>=>{
    const userData: UserLoginBody = req.body;
    // tendríamos que mirar si existe el usuario
    const user: User | null= await getUserByEmail(userData.email);
    if(!user){
        res.status(400).json({error:"credenciales incorrectas"});
        return;
    } 
    // aqui vendría bcrypt
    if(userData.password !== user?.password){
        res.status(400).json({error:"credenciales incorrectas"});
        return;
    }
    const payload = {
        id:user._id,
        role: user.role
    }
    const JWT_SECRET: string | undefined= process.env.JWT_SECRET
    if(JWT_SECRET){
        const token = jwt.sign(payload,JWT_SECRET,{expiresIn:'24h'})
        res.json({token:token})
    }else{
        console.error("No JWT secret in .env");
        res.status(400).json({error:"ha habido un error en el login"})
    }

}

const register = async (req:Request<{},{},UserRegisterBody>,res:Response):Promise<void>=>{
    const user: UserRegisterBody = req.body;
    if(!user.passwordRepeat || user.password !== user.passwordRepeat){
        res.status(400).json({error: "las contraseñas no coinciden"});
        return;
    }
    const result: User = await createUser({...user,role:"user"})
    res.json({data:result});
}

export default {login,register}