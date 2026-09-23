import React from "react";
import {Navigate,useLocation} from "react-router-dom";
import {useAuth} from "../AuthContext";
export default function RequireAuth({children}){
 const {firebaseUser,loading}=useAuth(); const loc=useLocation();
 if(loading)return <div className="container py-5 text-center"><div className="spinner-border"/></div>;
 return firebaseUser ? React.cloneElement(children,{user:firebaseUser}) : <Navigate to="/login" replace state={{from:loc.pathname}}/>;
}
