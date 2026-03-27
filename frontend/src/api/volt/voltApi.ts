import { Volt } from './types';
import {
  ListVolts,
  CreateVolt,
  DeleteVolt,
  SelectDirectory,
} from '../../../wailsjs/go/wailshandler/VoltHandler';

export async function listVolts(): Promise<Volt[]> {
  return ListVolts();
}

export async function createVolt(name: string, path: string): Promise<Volt> {
  return CreateVolt(name, path);
}

export async function deleteVolt(id: string): Promise<void> {
  return DeleteVolt(id);
}

export async function selectDirectory(): Promise<string> {
  return SelectDirectory();
}
