const fs = require('fs');
let code = fs.readFileSync('src/database/migrations.ts', 'utf-8');

const replacement = `
        for (let i = 0; i < migration.up.length; i++) {
          const statement = migration.up[i];
          let prep;
          try {
            prep = await db.prepareAsync(statement);
          } catch (e: any) {
            console.error(\`[Database] PREPARE FAILED\`);
            console.error(\`Migration: \${migration.id} \${migration.name}\`);
            console.error(\`Statement index: \${i}\`);
            console.error(\`SQL: \${statement.substring(0, 500)}\`);
            console.error(\`Error:\`, e);
            throw e;
          }

          try {
            await prep.executeAsync();
          } catch (e: any) {
            console.error(\`[Database] EXECUTE FAILED\`);
            console.error(\`Migration: \${migration.id} \${migration.name}\`);
            console.error(\`Statement index: \${i}\`);
            console.error(\`SQL: \${statement.substring(0, 500)}\`);
            console.error(\`Error:\`, e);
            throw e;
          } finally {
            try {
              await prep.finalizeAsync();
            } catch (finalizeError) {
              console.error(\`[Database] FINALIZE FAILED\`);
              console.error(\`Migration: \${migration.id} \${migration.name}\`);
              console.error(\`Statement index: \${i}\`);
              console.error(\`Finalize error:\`, finalizeError);
            }
          }
        }
`;

code = code.replace(
  /for \(let i = 0; i < migration\.up\.length; i\+\+\) \{[\s\S]*?throw e;\n\s*\}\n\s*\}/,
  replacement.trim()
);

fs.writeFileSync('src/database/migrations.ts', code);
