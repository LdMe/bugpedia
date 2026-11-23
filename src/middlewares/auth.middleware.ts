import type {RequestHandler} from "express";
import jwt, {type JwtPayload} from "jsonwebtoken";

declare global {
    namespace Express {
        interface Request {
            user?: {
                _id: string,
                role: "user"| "admin"
            }
        }
    }
}
interface JwtPayloadWithId extends JwtPayload {
    _id: string,
    role: "user" | "admin"
}

const isAuthenticated: RequestHandler = async(req,res,next)=>{

    const authorization = req.headers.authorization;
    console.log("token",authorization);
    if(!authorization || !authorization.startsWith('Bearer ')){
        res.status(401).json({error:"No hay token de autenticación"});
        return;
    }
    const token = authorization.split(" ")[1];
    const JWT_SECRET = process.env.JWT_SECRET;
    if(JWT_SECRET){
        const payload= jwt.verify(token, JWT_SECRET) as JwtPayloadWithId;
        // mirar en base de datos que el usuario con ese id existe y sacar su rol en vez de fiarnos del token
        req.user = {
            _id: payload._id,
            role: payload.role
        }

    }else{
        console.error("No hay JWT_SECRET");
        res.status(500).json({error:"Error de servidor"});
        return;
    }
    next(); 
}

const isAdmin: RequestHandler = async(req,res,next)=>{
    if(!req.user || req.user.role !== "admin"){
        res.status(403).json({error:"No tienes permiso"});
        return;
    }
    next();
}


export {isAuthenticated,isAdmin}