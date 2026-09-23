import React,{useState} from "react";
import {Link,NavLink,useNavigate} from "react-router-dom";
import {useAuth} from "../AuthContext";
export default function Navbar(){
 const [open,setOpen]=useState(false);const nav=useNavigate();const {firebaseUser,sessionUser,isAdmin,logout}=useAuth();
 async function doLogout(){await logout();nav("/login")}
 const loggedIn=!!firebaseUser;
 return <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top"><div className="container"><Link className="navbar-brand fw-bold text-primary" to="/"><i className="bi bi-bus-front me-2"/>Hems Transport Services</Link><button className="navbar-toggler" onClick={()=>setOpen(!open)} aria-label="Toggle navigation"><span className="navbar-toggler-icon"/></button><div className={`collapse navbar-collapse ${open?"show":""}`}><ul className="navbar-nav ms-auto align-items-lg-center gap-lg-1"><li className="nav-item"><NavLink className="nav-link" to="/">Home</NavLink></li><li className="nav-item"><NavLink className="nav-link" to="/booking">Schedules & Book</NavLink></li>{loggedIn&&<li className="nav-item"><NavLink className="nav-link" to="/bookings">My Bookings</NavLink></li>}{isAdmin&&<li className="nav-item"><NavLink className="nav-link text-primary fw-semibold" to="/admin"><i className="bi bi-speedometer2 me-1"/>Admin</NavLink></li>}{loggedIn?<li className="nav-item ms-lg-2 d-flex align-items-center gap-2"><span className="small text-secondary d-none d-md-inline">{sessionUser?.full_name||firebaseUser.displayName||firebaseUser.email}</span><button className="btn btn-outline-danger btn-sm" onClick={doLogout}>Logout</button></li>:<li className="nav-item ms-lg-2"><Link className="btn btn-primary btn-sm" to="/login">Login</Link></li>}</ul></div></div></nav>
}
