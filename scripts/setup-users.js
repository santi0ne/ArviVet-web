// Script para crear usuarios de prueba en Supabase Auth
const { createClient } = require('@supabase/supabase-js');

// Variables de entorno
const supabaseUrl = 'https://earsfeijkxfxdyblnmtx.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'TU_SERVICE_ROLE_KEY_AQUI';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUsers = [
  {
    email: 'admin@arvivet.com',
    password: 'admin123',
    userData: {
      nombre: 'Administrador ArviVet',
      rol_id: 1,
    },
  },
  {
    email: 'vet@arvivet.com',
    password: 'vet123',
    userData: {
      nombre: 'Dr. Veterinario',
      rol_id: 2,
    },
  },
  {
    email: 'cliente@test.com',
    password: 'test123',
    userData: {
      nombre: 'Cliente Test',
      rol_id: 4,
    },
  },
];

async function createUsers() {
  console.log('🚀 Creando usuarios de prueba en Supabase...\n');

  for (const user of testUsers) {
    try {
      console.log(`Creando usuario: ${user.email}`);

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirmar email
        });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`⚠️  Usuario ${user.email} ya existe`);
        } else {
          console.error(`❌ Error creando ${user.email}:`, authError.message);
        }
        continue;
      }

      console.log(`✅ Usuario creado en Auth: ${user.email}`);

      // 2. Verificar/crear usuario en tabla users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('correo', user.email)
        .single();

      if (existingUser) {
        console.log(`✅ Usuario ya existe en tabla: ${user.email}`);
      } else {
        const { error: dbError } = await supabase.from('users').insert({
          correo: user.email,
          nombre: user.userData.nombre,
          contrasena: 'managed_by_supabase_auth',
          rol_id: user.userData.rol_id,
          telefono: '+593-99-000-0000',
          direccion: 'Dirección de prueba',
        });

        if (dbError) {
          console.error(`❌ Error insertando en tabla users:`, dbError.message);
        } else {
          console.log(`✅ Usuario insertado en tabla: ${user.email}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error general con ${user.email}:`, error.message);
    }

    console.log('---');
  }

  console.log('🎉 Proceso completado!\n');

  // Verificar usuarios creados
  console.log('📋 Verificando usuarios...');
  const { data: users, error } = await supabase
    .from('users')
    .select(
      `
      id, 
      nombre, 
      correo, 
      u_roles(nombre)
    `
    )
    .in(
      'correo',
      testUsers.map(u => u.email)
    );

  if (error) {
    console.error('❌ Error verificando usuarios:', error.message);
  } else {
    console.log('\n✅ Usuarios en la base de datos:');
    users.forEach(user => {
      console.log(
        `- ${user.correo}: ${user.nombre} (${user.u_roles?.nombre || 'sin rol'})`
      );
    });
  }
}

// Función para probar login
async function testLogin() {
  console.log('\n🧪 Probando login...');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@arvivet.com',
    password: 'admin123',
  });

  if (error) {
    console.error('❌ Error en login:', error.message);
  } else {
    console.log('✅ Login exitoso:', data.user.email);

    // Cerrar sesión
    await supabase.auth.signOut();
  }
}

// Ejecutar
if (require.main === module) {
  createUsers()
    .then(() => testLogin())
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { createUsers, testLogin };
