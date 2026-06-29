"""Clear demo data and start with a fresh database for real-time use."""
import os
from pathlib import Path

def clear_demo_data():
    db_path = Path(__file__).parent / "community_hero.db"

    if db_path.exists():
        os.remove(db_path)
        print("✅ Demo database deleted")
        print("🔄 Start the server to create a fresh database for real-time data")
        print("\nRun: python -m uvicorn app.main:app --reload")
    else:
        print("ℹ️  No database found - will be created on first server start")

if __name__ == "__main__":
    clear_demo_data()
