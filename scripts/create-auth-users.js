// Script para crear usuarios en Supabase Auth
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Usar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno faltantes');
  console.log('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔧 Configurando cliente Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAuthUsers() {
  console.log('🚀 Creando usuarios de prueba en Supabase Auth...\n');

  // Usuarios de prueba
  const testUsers = [
    {
      email: 'admin@arvivet.com',
      password: 'admin123',
      role: 'Administrador'
    },
    {
      email: 'vet@arvivet.com',
      password: 'vet123',
      role: 'Veterinario'
    }
  ];

  for (const user of testUsers) {
    try {
      console.log(`Creando usuario: ${user.email}`);
      
      // Intentar crear el usuario
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  Usuario ${user.email} ya existe`);
        } else {
          console.error(`❌ Error creando ${user.email}:`, error.message);
        }
      } else {
        console.log(`✅ Usuario creado en Auth: ${user.email}`);
        console.log(`   User ID: ${data.user?.id}`);
      }

    } catch (error) {
      console.error(`💥 Error con ${user.email}:`, error.message);
    }

    console.log('---');
  }

  console.log('🎉 Proceso completado!');
  console.log('\n📝 Nota importante:');
  console.log('Los usuarios han sido creados en Supabase Auth.');
  console.log('Ahora puedes hacer login con:');
  console.log('- admin@arvivet.com / admin123');
  console.log('- vet@arvivet.com / vet123');
}

createAuthUsers().finally(() => process.exit(0));