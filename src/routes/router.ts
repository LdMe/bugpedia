import {Router,type Request, type Response} from "express";
import authController from "../controllers/auth.controller.ts";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/health",(req:Request,res:Response): void =>{
    res.json({message:"Tutto bene"});
})

// register y login

router.post("/auth/register",authController.register)
router.post("/auth/login",authController.login)
router.get("/auth/me",(req,res)=>{
    res.json({message:"me"})
})

// bugs

router.get("/bugs",isAuthenticated,isAdmin,(req,res)=>{
    res.json({message:"all bugs"})
})
router.get("/bugs/:id",(req,res)=>{
    res.json({message:"bug by id"})
})

router.post("/bugs",(req,res)=>{
    res.json({message:"create bug"})
})

router.delete("/bugs/:id",(req,res)=>{
    res.json({message:"all bugs"})
})

router.post("/bugs/:id/solutions",(req,res)=>{
    res.json({message:"new solution"})
})

router.delete("/bugs/:id/solutions/:solutionId",(req,res)=>{
    res.json({message:"delete solution"})
})

router.patch("/bugs/:id/solutions/:solutionId/verify",(req,res)=>{
    res.json({message:"verify solution"});
})

export default router;