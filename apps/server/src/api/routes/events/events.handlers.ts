import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { db } from "@/api/db";
import { events } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { 
  ListRoute, 
  GetOneRoute, 
  CreateRoute, 
  UpdateRoute, 
  PatchRoute, 
  RemoveRoute 
} from "./events.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const data = await db.query.events.findMany({
    orderBy: (events, { asc }) => [asc(events.displayOrder)],
  });
  
  // Transform data to match DTO structure
  const transformedData = data.map(event => ({
    ...event,
    createdAt: event.createdAt?.toISOString(),
    updatedAt: event.updatedAt?.toISOString(),
  }));
  
  return c.json(transformedData);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const eventId = parseInt(id);
  
  const data = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!data) {
    return c.json(
      { message: "Event not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }
  
  const transformedData = {
    ...data,
    createdAt: data.createdAt?.toISOString(),
    updatedAt: data.updatedAt?.toISOString(),
  };
  
  return c.json(transformedData, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    // Check for duplicates
    const existing = await db.query.events.findFirst({
      where: (events, { or, eq }) => or(
        eq(events.code, body.code),
        eq(events.noteNumber, body.noteNumber)
      ),
    });
    
    if (existing) {
      return c.json(
        { message: "Event with this code or note number already exists" },
        HttpStatusCodes.CONFLICT
      );
    }
    
    const [newEvent] = await db.insert(events)
      .values(body)
      .returning();
    
    const transformedData = {
      ...newEvent,
      createdAt: newEvent.createdAt?.toISOString(),
      updatedAt: newEvent.updatedAt?.toISOString(),
    };
    
    return c.json(transformedData, HttpStatusCodes.CREATED);
  } catch (error) {
    return c.json(
      { message: "Failed to create event" },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const eventId = parseInt(id);
  const body = await c.req.json();
  
  try {
    const existing = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    
    if (!existing) {
      return c.json(
        { message: "Event not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }
    
    const [updatedEvent] = await db.update(events)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId))
      .returning();
    
    const transformedData = {
      ...updatedEvent,
      createdAt: updatedEvent.createdAt?.toISOString(),
      updatedAt: updatedEvent.updatedAt?.toISOString(),
    };
    
    return c.json(transformedData, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      { message: "Failed to update event" },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.param();
  const eventId = parseInt(id);
  const body = await c.req.json();
  
  try {
    const existing = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    
    if (!existing) {
      return c.json(
        { message: "Event not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }
    
    const [updatedEvent] = await db.update(events)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId))
      .returning();
    
    const transformedData = {
      ...updatedEvent,
      createdAt: updatedEvent.createdAt?.toISOString(),
      updatedAt: updatedEvent.updatedAt?.toISOString(),
    };
    
    return c.json(transformedData, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      { message: "Failed to update event" },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const eventId = parseInt(id);
  
  const existing = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  
  if (!existing) {
    return c.json(
      { message: "Event not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }
  
  await db.delete(events).where(eq(events.id, eventId));
  
  return c.body(null, HttpStatusCodes.NO_CONTENT);
};