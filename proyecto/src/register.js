import { supabase } from './supabase.js';

/**
 * Lógica principal para manejar el envío del formulario de registro.
 * Ahora usa 'auth_user_id' en la inserción para evitar el error de clave generada.
 */
async function handleRegisterSubmit(e, form, errorMsg) {
    e.preventDefault();
    errorMsg.textContent = ''; // Limpiar mensajes anteriores
    errorMsg.style.color = 'red';

    // Captura de los valores del formulario
    const username = form.username.value.trim();
    const email = form.correo.value.trim();
    const password = form.password.value.trim();

    if (!username || !email || !password) {
        errorMsg.textContent = 'Por favor completa los campos obligatorios (Usuario, Correo, Contraseña).';
        return;
    }

    // 1️⃣ Crear usuario en Auth (Supabase)
    const { data: dataAuth, error: errorAuth } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (errorAuth) {
        // Muestra cualquier error de autenticación (email duplicado, contraseña débil, etc.)
        errorMsg.textContent = `Error en autenticación: ${errorAuth.message}`;
        return;
    }

    const uid = dataAuth.user?.id;

    if (!uid) {
        // Supabase requiere confirmación por email antes de que el usuario esté activo
        errorMsg.textContent = '✅ Registro de cuenta exitoso. Revisa tu correo electrónico para confirmar la cuenta.';
        errorMsg.style.color = 'green';
        return;
    }

    // 2️⃣ Insertar perfil en la tabla 'Users'
    // IMPORTANTE: Ahora usamos 'auth_user_id' para el ID de Supabase, 
    // y OMITIMOS 'user_id' para que PostgreSQL lo genere automáticamente.
    const { error: errorInsert } = await supabase.from('users').insert([
        { 
            user_id: uid,
            username: username, 
            email: email, 
            password_hash: 'HANDLE_BY_SUPABASE', // Placeholder
            status: 'online',
            avatar_url: `https://placehold.co/100x100/36393f/ffffff?text=${username.substring(0, 1).toUpperCase()}`
        }
    ]);

    if (errorInsert) {
        errorMsg.textContent = 'Error guardando datos del perfil de usuario: ' + errorInsert.message;
        // CONSIDERACIÓN: Si esto falla, deberías intentar eliminar la cuenta de Auth para evitar inconsistencias.
        return;
    }

    // 3️⃣ Mensaje de éxito
    errorMsg.textContent = '✅ ¡Registro exitoso! Ya puedes iniciar sesión.';
    errorMsg.style.color = 'green';
}

/**
 * Función que muestra la interfaz de registro y adjunta el listener.
 */
export function mostrarRegistro() {
    const app = document.getElementById('app');
    if (!app) {
        console.error("El elemento con id 'app' no fue encontrado.");
        return;
    }

    app.innerHTML = `
        <section class="p-8 max-w-lg mx-auto bg-gray-900 rounded-xl shadow-2xl text-white mt-10 border border-indigo-700">
            <h2 class="text-3xl font-bold mb-6 text-center text-indigo-400">Registro de Usuario (Discord Lite)</h2>
            <form id="registro-form" class="space-y-4">
                <input type="text" name="username" placeholder="Nombre de Usuario (Username)" 
                       class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-white" 
                       required />
                <input type="email" name="correo" placeholder="Correo Electrónico" 
                       class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-white" 
                       required />
                <input type="password" name="password" placeholder="Contraseña" 
                       class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-white" 
                       required />
                
                <button type="submit" 
                        class="w-full p-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition duration-200">
                    Registrarse
                </button>
            </form>
            <p id="error" class="mt-4 text-center font-medium" style="color:red;"></p>
        </section>
    `;
    
    // Obtener elementos después de la inserción de innerHTML
    const form = document.getElementById('registro-form');
    const errorMsg = document.getElementById('error');
    
    // Adjuntar el listener de eventos
    if (form) {
        // Pasamos solo los elementos necesarios al handler
        form.addEventListener('submit', (e) => handleRegisterSubmit(e, form, errorMsg));
    }
}