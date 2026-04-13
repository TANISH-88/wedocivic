import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.group import Group, GroupMember, GroupInvitation
from app.models.user import User
from app.models.message import GroupMessage
from app.models.follow import Follow
import inspect

MONGO_URI = "mongodb+srv://vishalofficial700_db_user:CNwTrt9P4EhEjfkf@cluster0.opzrukd.mongodb.net/civicimpact?retryWrites=true&w=majority"
DB_NAME = "civicimpact"

async def test():
    client = AsyncIOMotorClient(MONGO_URI)
    await init_beanie(database=client[DB_NAME], document_models=[Group, GroupMember, GroupInvitation, User, GroupMessage, Follow])
    
    query1 = {"is_official": {"$ne": True}, "is_community": {"$ne": True}}
    qs1 = Group.find(query1)
    print("Query 1:", qs1.get_filter_query())
    
    query2 = Group.find(Group.is_official != True, Group.is_community != True)
    print("Query 2:", query2.get_filter_query())

    query3 = {"is_official": False, "is_community": False}
    qs3 = Group.find(query3)
    print("Query 3:", qs3.get_filter_query())
    
    res = await qs1.to_list()
    print("Count qs1:", len(res))
    
    res2 = await query2.to_list()
    print("Count query2:", len(res2))

    client.close()

if __name__ == "__main__":
    asyncio.run(test())
