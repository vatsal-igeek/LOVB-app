import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import random
import requests
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

def image_url_to_base64(url: str) -> str:
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return base64.b64encode(response.content).decode('utf-8')
    except:
        pass
    return ""

async def reseed_players():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Clear existing players and lineups
    print("Clearing existing players and lineups...")
    await db.players.delete_many({})
    await db.lineups.delete_many({})
    print("Cleared!")
    
    # Player images from Unsplash - volleyball themed
    image_urls = [
        "https://images.unsplash.com/photo-1599509055064-8a742910930a?w=400",
        "https://images.unsplash.com/photo-1553451310-1416336a3cca?w=400",
        "https://images.unsplash.com/photo-1521138054413-5a47d349b7af?w=400",
        "https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=400",
        "https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?w=400",
        "https://images.unsplash.com/photo-1692197174597-1d85555c9b33?w=400",
        "https://images.unsplash.com/photo-1606335544053-c43609e6155d?w=400",
        "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400",
        "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=400",
        "https://images.unsplash.com/photo-1593786481097-7e512db2cada?w=400",
    ]
    
    positions = ["S", "OH", "OPP", "MB", "L", "DS"]
    position_names = {
        "S": "Setter",
        "OH": "Outside Hitter", 
        "OPP": "Opposite Hitter",
        "MB": "Middle Blocker",
        "L": "Libero",
        "DS": "Defensive Specialist"
    }
    
    teams = [
        "Phoenix Fire", "Wave Riders", "Thunder Storm", "Lightning Bolts", 
        "Sky Hawks", "Ocean Warriors", "Desert Eagles", "Mountain Lions",
        "Storm Chasers", "Coastal Crushers"
    ]
    
    first_names = [
        "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Blake", "Drew",
        "Cameron", "Sage", "River", "Sky", "Phoenix", "Dakota", "Kai", "Rowan", "Hayden", "Parker",
        "Emerson", "Finley", "Logan", "Peyton", "Reese", "Ryan", "Sawyer", "Spencer", "Tatum", "Wren",
        "Charlie", "Jamie", "Ellis", "Kendall", "Dylan", "Harper", "Bailey", "Sidney", "Skyler", "Sam"
    ]
    
    last_names = [
        "Chen", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez",
        "Martinez", "Lee", "Kim", "Park", "Patel", "Singh", "Wang", "Liu", "Nguyen", "Anderson",
        "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Thompson", "White", "Harris", "Clark", "Lewis",
        "Walker", "Hall", "Allen", "Young", "King", "Wright", "Lopez", "Hill", "Green", "Adams"
    ]
    
    bios = [
        "A powerful attacker with exceptional court vision and leadership skills.",
        "Known for lightning-fast reflexes and pinpoint serving accuracy.",
        "Brings years of international experience and clutch performance.",
        "Defensive specialist with incredible agility and game-reading ability.",
        "Rising star with explosive jumping ability and powerful spikes.",
        "Veteran player known for consistent performance under pressure.",
        "Technical expert with precise ball control and strategic thinking.",
        "Dynamic all-around player with exceptional versatility.",
        "Elite server with a devastating jump float technique.",
        "Master of reading opponents and making game-changing plays.",
        "Powerful blocker who dominates at the net.",
        "Quick setter with exceptional court awareness.",
        "Tenacious defender who never gives up on a ball.",
        "Explosive attacker with a wide range of shots.",
        "Steady presence who brings calm under pressure."
    ]
    
    players = []
    random.seed(42)  # For consistent random generation
    
    # Generate 30-35 players
    num_players = random.randint(30, 35)
    print(f"Generating {num_players} players...")
    
    used_names = set()
    used_jerseys = set()
    
    for i in range(num_players):
        position = positions[i % len(positions)]
        
        # Generate unique name
        attempts = 0
        while attempts < 100:
            name = f"{random.choice(first_names)} {random.choice(last_names)}"
            if name not in used_names:
                used_names.add(name)
                break
            attempts += 1
        
        # Generate unique jersey number
        attempts = 0
        while attempts < 100:
            jersey = random.randint(1, 99)
            if jersey not in used_jerseys:
                used_jerseys.add(jersey)
                break
            attempts += 1
        
        # Credit costs vary by position (strategically distributed)
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
        
        print(f"Creating player {i+1}/{num_players}: {name} ({position})...")
        
        player = {
            "name": name,
            "jerseyNumber": jersey,
            "position": position,
            "positionName": position_names[position],
            "teamName": random.choice(teams),
            "creditCost": credit_cost,
            "bio": random.choice(bios),
            "imageBase64": image_url_to_base64(image_urls[i % len(image_urls)]),
            "stats": {
                "matches": random.randint(50, 200),
                "sets": random.randint(100, 500),
                "kills_per_set": round(random.uniform(1.5, 5.5), 2),
                "digs_per_set": round(random.uniform(1.0, 4.5), 2),
                "blocks_per_set": round(random.uniform(0.3, 2.8), 2),
                "aces_per_set": round(random.uniform(0.2, 1.8), 2)
            }
        }
        players.append(player)
    
    print(f"\nInserting {len(players)} players into database...")
    await db.players.insert_many(players)
    
    # Count players by position
    position_counts = {}
    for pos in positions:
        count = sum(1 for p in players if p["position"] == pos)
        position_counts[position_names[pos]] = count
    
    print("\n✅ SUCCESS!")
    print(f"Total players: {len(players)}")
    print("\nPlayers by position:")
    for pos_name, count in position_counts.items():
        print(f"  {pos_name}: {count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(reseed_players())
