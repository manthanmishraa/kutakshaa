from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token, get_current_user, get_password_hash, verify_password
from app.database import get_db
from app.models import User
from app.schemas import Token, UserCreate, UserLogin, UserOut

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter((User.email == payload.email) | (User.username == payload.username)).first():
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        email=payload.email,
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter((User.username == payload.username) | (User.email == payload.username)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.username}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": token, "token_type": "bearer"}


@router.post("/logout")
def logout():
    return {"message": "Logout successful"}


@router.get("/profile", response_model=UserOut)
def profile(current_user: User = Depends(get_current_user)):
    return current_user
