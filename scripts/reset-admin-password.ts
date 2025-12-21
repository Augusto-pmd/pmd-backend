import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../src/users/user.entity';

async function resetAdminPassword() {
  const email = 'admin@pmd.com';
  const password = '1102Pequ';

  try {
    // Initialize DataSource (solo una vez)
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      console.log('✅ Conexión a la base de datos inicializada');
    }

    // Hash the password
    const hash = await bcrypt.hash(password, 10);

    // Get user repository from DataSource real
    const userRepository = dataSource.getRepository(User);
    
    // Update password by email
    const result = await userRepository.update(
      { email },
      { password: hash }
    );

    if (result.affected && result.affected > 0) {
      console.log(`✅ Password actualizado para ${email}`);
    } else {
      console.log(`⚠️  Usuario ${email} no encontrado`);
    }
  } catch (error) {
    console.error('❌ Error al actualizar la contraseña:', error);
    throw error;
  } finally {
    // Cerrar conexión DataSource correctamente
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('✅ Conexión a la base de datos cerrada');
    }
  }
}

resetAdminPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

