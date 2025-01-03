import FriendRequest from "../../models/mysql/friend_request.js";
import User from "../../models/mysql/user.js";
import { Op } from "sequelize";
export const friendResolver = {
  Query: {
    friendRequests: async (_, __, context) => {
      try {
        if (!context.user)
          throw new Error("Not authenticated, Cannot fetch friend requests");
        const me = context.user.user.user_id;
        const friendRequests = await FriendRequest.findAll({
          where: {
            [Op.or]: [{ sender_id: me }, { receiver_id: me }],
            status: "pending",
          },
        });
        return friendRequests;
      } catch (error) {
        console.error(error);
        throw new Error("Error fetching friend requests");
      }
    },
  },
  Mutation: {
    sendFriendRequest: async (_, { receiver_id }, context) => {
      try {
        if (!context.user)
          throw new Error("Not authenticated, Cannot send friend request");
        const sender_id = context.user.user.user_id;
        if (sender_id === receiver_id)
          throw new Error("Cannot send friend request to yourself");
        const receiver = await User.findByPk(receiver_id);
        if (!receiver) throw new Error("Receiver not found");
        const existingFriendRequest = await FriendRequest.findOne({
          where: {
            [Op.or]: [
              {
                sender_id: sender_id,
                receiver_id: receiver_id,
              },
              {
                sender_id: receiver_id,
                receiver_id: sender_id,
              },
            ],
          },
        });
        if (existingFriendRequest)
          throw new Error("Friend request already sent");
        const friendRequest = await FriendRequest.create({
          sender_id,
          receiver_id,
        });
        return friendRequest;
      } catch (error) {
        console.error(error);
        throw new Error(error.message);
      }
    },
    acceptFriendRequest: async (_, { id }, context) => {
      try {
        if (!context.user)
          throw new Error("Not authenticated, Cannot accept friend request");
        const friendRequest = await FriendRequest.findByPk(id);
        if (!friendRequest) throw new Error("Friend request not found");
        if (context.user.user.user_id !== friendRequest.receiver_id)
          throw new Error("Cannot accept friend request. You are not receiver");
        friendRequest.status = "accepted";
        await friendRequest.save();
        return friendRequest;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    declineFriendRequest: async (_, { id }, context) => {
      try {
        if (!context.user)
          throw new Error("Not authenticated, Cannot decline friend request");
        const friendRequest = await FriendRequest.findByPk(id);
        if (!friendRequest) throw new Error("Friend request not found");
        await friendRequest.destroy();
        return {
          status: "Destroy successfully !",
          FriendRequest: friendRequest,
        };
      } catch (error) {
        throw new Error(error.message);
      }
    },
  },
};