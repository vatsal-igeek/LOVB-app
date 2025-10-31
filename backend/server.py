from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import bcrypt
import jwt
from bson import ObjectId
import requests
import base64
from io import BytesIO

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Models
class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserSignIn(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    token: str

class PlayerStats(BaseModel):
    matches: int
    sets: int
    kills_per_set: float
    digs_per_set: float
    blocks_per_set: float
    aces_per_set: float

class Player(BaseModel):
    id: str
    name: str
    jerseyNumber: int
    position: str
    teamName: str
    creditCost: int
    bio: str
    imageBase64: str
    stats: PlayerStats

class LineupSlot(BaseModel):
    position: str
    player: Optional[Player] = None

class Lineup(BaseModel):
    userId: str
    setter: Optional[Player] = None
    outsideHitter: Optional[Player] = None
    oppositeHitter: Optional[Player] = None
    middleBlocker: Optional[Player] = None
    libero: Optional[Player] = None
    defensiveSpecialist: Optional[Player] = None
    creditsUsed: int = 0
    remaining: int = 100
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class SaveLineupRequest(BaseModel):
    setter: Optional[str] = None
    outsideHitter: Optional[str] = None
    oppositeHitter: Optional[str] = None
    middleBlocker: Optional[str] = None
    libero: Optional[str] = None
    defensiveSpecialist: Optional[str] = None

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def image_url_to_base64(url: str) -> str:
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return base64.b64encode(response.content).decode('utf-8')
    except:
        pass
    return ""

# Auth Routes
@api_router.post("/auth/signup", response_model=UserResponse)
async def signup(user_data: UserSignUp):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = hash_password(user_data.password)
    user_doc = {
        "email": user_data.email,
        "password": hashed_pw,
        "name": user_data.name,
        "createdAt": datetime.utcnow()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    token = create_access_token({"sub": user_id})
    
    return UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        token=token
    )

@api_router.post("/auth/signin", response_model=UserResponse)
async def signin(credentials: UserSignIn):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id})
    
    return UserResponse(
        id=user_id,
        email=user["email"],
        name=user["name"],
        token=token
    )

# Player Routes
@api_router.get("/players", response_model=List[Player])
async def get_players(
    position: Optional[str] = None,
    search: Optional[str] = None,
    sortBy: Optional[str] = "name",
    user: dict = Depends(get_current_user)
):
    query = {}
    if position:
        query["position"] = position
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    sort_field = sortBy if sortBy in ["name", "creditCost"] else "name"
    
    players = await db.players.find(query).sort(sort_field, 1).to_list(100)
    
    return [
        Player(
            id=str(p["_id"]),
            name=p["name"],
            jerseyNumber=p["jerseyNumber"],
            position=p["position"],
            teamName=p["teamName"],
            creditCost=p["creditCost"],
            bio=p["bio"],
            imageBase64=p["imageBase64"],
            stats=PlayerStats(**p["stats"])
        )
        for p in players
    ]

@api_router.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str, user: dict = Depends(get_current_user)):
    player = await db.players.find_one({"_id": ObjectId(player_id)})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return Player(
        id=str(player["_id"]),
        name=player["name"],
        jerseyNumber=player["jerseyNumber"],
        position=player["position"],
        teamName=player["teamName"],
        creditCost=player["creditCost"],
        bio=player["bio"],
        imageBase64=player["imageBase64"],
        stats=PlayerStats(**player["stats"])
    )

# Lineup Routes
@api_router.post("/lineup/save")
async def save_lineup(lineup_data: SaveLineupRequest, user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    
    # Fetch all selected players
    player_ids = []
    for field in ["setter", "outsideHitter", "oppositeHitter", "middleBlocker", "libero", "defensiveSpecialist"]:
        pid = getattr(lineup_data, field)
        if pid:
            player_ids.append(ObjectId(pid))
    
    if len(player_ids) != 6:
        raise HTTPException(status_code=400, detail="All 6 positions must be filled")
    
    players = await db.players.find({"_id": {"$in": player_ids}}).to_list(10)
    player_map = {str(p["_id"]): p for p in players}
    
    # Calculate total credits
    total_credits = sum(player_map[str(pid)]["creditCost"] for pid in player_ids)
    
    if total_credits > 100:
        raise HTTPException(status_code=400, detail=f"Budget exceeded. Total: {total_credits}/100")
    
    # Build lineup document
    lineup_doc = {
        "userId": user_id,
        "setter": lineup_data.setter,
        "outsideHitter": lineup_data.outsideHitter,
        "oppositeHitter": lineup_data.oppositeHitter,
        "middleBlocker": lineup_data.middleBlocker,
        "libero": lineup_data.libero,
        "defensiveSpecialist": lineup_data.defensiveSpecialist,
        "creditsUsed": total_credits,
        "remaining": 100 - total_credits,
        "updatedAt": datetime.utcnow()
    }
    
    # Upsert lineup
    await db.lineups.update_one(
        {"userId": user_id},
        {"$set": lineup_doc},
        upsert=True
    )
    
    return {"message": "Lineup saved successfully", "creditsUsed": total_credits, "remaining": 100 - total_credits}

@api_router.get("/lineup")
async def get_lineup(user: dict = Depends(get_current_user)):
    user_id = str(user["_id"])
    lineup = await db.lineups.find_one({"userId": user_id})
    
    if not lineup:
        return {
            "setter": None,
            "outsideHitter": None,
            "oppositeHitter": None,
            "middleBlocker": None,
            "libero": None,
            "defensiveSpecialist": None,
            "creditsUsed": 0,
            "remaining": 100
        }
    
    # Fetch player details
    player_ids = []
    position_map = {}
    for field in ["setter", "outsideHitter", "oppositeHitter", "middleBlocker", "libero", "defensiveSpecialist"]:
        pid = lineup.get(field)
        if pid:
            player_ids.append(ObjectId(pid))
            position_map[pid] = field
    
    players = await db.players.find({"_id": {"$in": player_ids}}).to_list(10)
    player_data = {}
    for p in players:
        player_data[str(p["_id"])] = Player(
            id=str(p["_id"]),
            name=p["name"],
            jerseyNumber=p["jerseyNumber"],
            position=p["position"],
            teamName=p["teamName"],
            creditCost=p["creditCost"],
            bio=p["bio"],
            imageBase64=p["imageBase64"],
            stats=PlayerStats(**p["stats"])
        )
    
    return {
        "setter": player_data.get(lineup.get("setter")) if lineup.get("setter") else None,
        "outsideHitter": player_data.get(lineup.get("outsideHitter")) if lineup.get("outsideHitter") else None,
        "oppositeHitter": player_data.get(lineup.get("oppositeHitter")) if lineup.get("oppositeHitter") else None,
        "middleBlocker": player_data.get(lineup.get("middleBlocker")) if lineup.get("middleBlocker") else None,
        "libero": player_data.get(lineup.get("libero")) if lineup.get("libero") else None,
        "defensiveSpecialist": player_data.get(lineup.get("defensiveSpecialist")) if lineup.get("defensiveSpecialist") else None,
        "creditsUsed": lineup.get("creditsUsed", 0),
        "remaining": lineup.get("remaining", 100)
    }

# Seed Players Endpoint
@api_router.post("/seed-players")
async def seed_players():
    existing = await db.players.count_documents({})
    if existing > 0:
        return {"message": f"Players already seeded ({existing} players exist)"}
    
    # Player images from Unsplash
    image_urls = [
        "https://images.unsplash.com/photo-1599509055064-8a742910930a?w=400",
        "https://images.unsplash.com/photo-1553451310-1416336a3cca?w=400",
        "https://images.unsplash.com/photo-1521138054413-5a47d349b7af?w=400",
        "https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=400",
        "https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?w=400",
        "https://images.unsplash.com/photo-1692197174597-1d85555c9b33?w=400",
        "https://images.unsplash.com/photo-1606335544053-c43609e6155d?w=400",
    ]
    
    positions = ["S", "OH", "OPP", "MB", "L", "DS"]
    teams = ["Phoenix Fire", "Wave Riders", "Thunder Storm", "Lightning Bolts", "Sky Hawks", "Ocean Warriors"]
    
    first_names = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Blake", "Drew",
                   "Cameron", "Sage", "River", "Sky", "Phoenix", "Dakota", "Kai", "Rowan", "Hayden", "Parker",
                   "Emerson", "Finley", "Logan", "Peyton", "Reese", "Ryan", "Sawyer", "Spencer", "Tatum", "Wren"]
    
    last_names = ["Chen", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez",
                  "Martinez", "Lee", "Kim", "Park", "Patel", "Singh", "Wang", "Liu", "Nguyen", "Anderson",
                  "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Thompson", "White", "Harris", "Clark", "Lewis"]
    
    bios = [
        "A powerful attacker with exceptional court vision and leadership skills.",
        "Known for lightning-fast reflexes and pinpoint serving accuracy.",
        "Brings years of international experience and clutch performance.",
        "Defensive specialist with incredible agility and game-reading ability.",
        "Rising star with explosive jumping ability and powerful spikes.",
        "Veteran player known for consistent performance under pressure.",
        "Technical expert with precise ball control and strategic thinking.",
        "Dynamic all-around player with exceptional versatility."
    ]
    
    players = []
    import random
    
    for i in range(35):
        position = positions[i % len(positions)]
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        
        # Credit costs vary by position
        if position == "S":
            credit_cost = random.randint(12, 20)
        elif position in ["OH", "OPP"]:
            credit_cost = random.randint(15, 25)
        elif position == "MB":
            credit_cost = random.randint(10, 18)
        elif position == "L":
            credit_cost = random.randint(8, 15)
        else:  # DS
            credit_cost = random.randint(7, 14)
        
        player = {
            "name": name,
            "jerseyNumber": random.randint(1, 99),
            "position": position,
            "teamName": random.choice(teams),
            "creditCost": credit_cost,
            "bio": random.choice(bios),
            "imageBase64": image_url_to_base64(image_urls[i % len(image_urls)]),
            "stats": {
                "matches": random.randint(50, 200),
                "sets": random.randint(100, 500),
                "kills_per_set": round(random.uniform(2.0, 5.5), 2),
                "digs_per_set": round(random.uniform(1.5, 4.0), 2),
                "blocks_per_set": round(random.uniform(0.5, 2.5), 2),
                "aces_per_set": round(random.uniform(0.3, 1.5), 2)
            }
        }
        players.append(player)
    
    await db.players.insert_many(players)
    return {"message": f"Successfully seeded {len(players)} players"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
