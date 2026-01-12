### **1. OpenAPI needs “serializable” schemas**
- Not every Zod type can be represented in OpenAPI.
- Examples that break: z.json(), z.any(), z.union([z.string(), z.number()]).
- ✅ Instead: always use z.string(), z.number(), z.boolean(), z.object(), z.record().

### **2. Query parameters must be string in schemas**

- In HTTP, query params are always strings.
- Declaring z.number() or z.boolean() for query params will cause OpenAPI issues.
- ✅ Best practice: keep them z.string() in the schema, and cast inside the handler (Number(), === 'true').

### **3. Check /api/doc first when debugging**
- If /api/doc throws 500, it’s always a schema problem (not handler logic).
- ✅ Add logging around doc generation to quickly see which schema caused the crash.

### **4. Be careful with “loose” schema types**
- z.json() looks convenient but too loose for OpenAPI.
- OpenAPI wants structure: either a well-defined object schema, or a free-form record.
- ✅ Use z.record(z.string(), z.any()) for arbitrary JSON blobs.

### **5. Consistency across features**
- Notice how your event-mappings schema worked fine because it only used OpenAPI-friendly Zod types.
- ✅ Use that as a pattern for all future routes.