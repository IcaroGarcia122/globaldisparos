import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface WhatsAppGroupAttributes {
  id: number;
  instanceId: number;
  groupId: string; // ID do grupo no WhatsApp
  name: string;
  participantsCount: number;
  extractedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WhatsAppGroupCreationAttributes extends Optional<WhatsAppGroupAttributes, 'id' | 'participantsCount' | 'extractedAt'> {}

class WhatsAppGroup extends Model<WhatsAppGroupAttributes, WhatsAppGroupCreationAttributes> implements WhatsAppGroupAttributes {
  public id!: number;
  public instanceId!: number;
  public groupId!: string;
  public name!: string;
  public participantsCount!: number;
  public extractedAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WhatsAppGroup.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    instanceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'whatsapp_instances',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    groupId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    participantsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    extractedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'whatsapp_groups',
    indexes: [
      {
        fields: ['instance_id'],
      },
      {
        unique: true,
        fields: ['instance_id', 'group_id'],
      },
    ],
  }
);

export default WhatsAppGroup;
