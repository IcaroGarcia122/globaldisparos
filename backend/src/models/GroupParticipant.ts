import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface GroupParticipantAttributes {
  id: number;
  groupId: number;
  phoneNumber: string;
  name: string | null;
  isAdmin: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GroupParticipantCreationAttributes extends Optional<GroupParticipantAttributes, 'id' | 'name' | 'isAdmin'> {}

class GroupParticipant extends Model<GroupParticipantAttributes, GroupParticipantCreationAttributes> implements GroupParticipantAttributes {
  public id!: number;
  public groupId!: number;
  public phoneNumber!: string;
  public name!: string | null;
  public isAdmin!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GroupParticipant.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'whatsapp_groups',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'group_participants',
    indexes: [
      {
        fields: ['group_id'],
      },
      {
        fields: ['phone_number'],
      },
      {
        unique: true,
        fields: ['group_id', 'phone_number'],
      },
    ],
  }
);

export default GroupParticipant;
