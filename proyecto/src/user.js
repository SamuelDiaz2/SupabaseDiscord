import { supabase } from './supabase.js';
// Importamos la función de login para ofrecer el cierre de sesión
import { mostrarLogin } from './login.js'; 


// =================================================================
// 1. FUNCIONES CRUD INTEGRADAS (Directas a Supabase)
// =================================================================

/**
 * Obtiene el perfil de un usuario (username y avatar) de la tabla 'users'.
 * @param {string} userId - El UUID del usuario.
 * @returns {Promise<{username: string, avatar_url: string} | null>}
 */
async function getUserProfileInternal(userId) {
    // Busca el usuario por su 'user_id'
    const { data, error } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('user_id', userId)
        .single(); // Esperamos un solo registro

    if (error) {
        // Mostramos el error en consola para depuración
        console.error("Internal CRUD Error al obtener perfil:", error.message);
        return null;
    }
    return data;
}

/**
 * Actualiza el perfil de un usuario (username y/o avatar_url).
 * @param {string} userId - El UUID del usuario a actualizar.
 * @param {object} updates - Objeto con los campos a actualizar (ej: { username: 'nuevo_nombre' }).
 * @returns {Promise<boolean>} - True si la actualización fue exitosa.
 */
async function updateUserProfileInternal(userId, updates) {
    if (Object.keys(updates).length === 0) {
        console.warn("Internal CRUD: No se proporcionaron campos para actualizar.");
        return true;
    }

    // Actualiza el registro donde 'user_id' coincide
    const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', userId);

    if (error) {
        // Lanzamos una excepción para que el handler del formulario pueda capturarla
        throw new Error(`Error al actualizar el perfil: ${error.message}`);
    }

    return true;
}


// =================================================================
// 2. FUNCIÓN DE RENDERIZADO Y LÓGICA PRINCIPAL
// =================================================================

/**
 * Muestra la interfaz del perfil de usuario, carga los datos y maneja la actualización.
 */
export async function mostrarUser() {
    const app = document.getElementById("app");
    if (!app) return;

    // 1. Obtener usuario actual (Auth)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        app.innerHTML = '<p class="p-8 text-center text-red-400">Error: Debes iniciar sesión para ver tu perfil.</p>';
        return;
    }

    const userId = user.id;
    const userEmail = user.email; // El email lo obtenemos directamente de Auth

    // Renderizar la estructura inicial
    app.innerHTML = `
        <section class="p-8 max-w-lg mx-auto bg-gray-900 rounded-xl shadow-2xl text-white mt-10 border border-indigo-700">
            <h2 class="text-3xl font-bold mb-6 text-center text-indigo-400">Tu Perfil de Usuario</h2>
            <p class="text-sm text-gray-400 mb-6 text-center">ID de Usuario: ${userId.substring(0, 8)}...</p>

            <form id="user-form" class="space-y-4">
                
                <label for="username" class="block text-sm font-medium text-gray-300">Nombre de Usuario</label>
                <input type="text" id="username" required 
                       class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-white" />

                <label for="correo" class="block text-sm font-medium text-gray-300">Correo Electrónico (Solo Lectura)</label>
                <input type="email" id="correo" disabled 
                       class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed" />
                
                <label for="avatar_url" class="block text-sm font-medium text-gray-300">URL del Avatar</label>
                <input type="text" id="avatar_url" 
                       placeholder="Ej: https://mis-imagenes.com/mi-avatar.jpg"
                       class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-white" />
                
                <button type="submit" class="w-full p-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition duration-200">
                    Actualizar Datos
                </button>
            </form>
            <p id="mensaje" class="mt-4 text-center font-medium"></p>
            
            <div class="mt-6 text-center">
                <button id="logout-button" class="text-red-400 hover:text-red-300 font-semibold text-sm">Cerrar Sesión</button>
            </div>
        </section>
    `;

    const form = document.getElementById("user-form");
    const mensaje = document.getElementById("mensaje");
    const logoutButton = document.getElementById("logout-button");

    // Llenar email desde Auth
    document.getElementById("correo").value = userEmail || "";

    // 2. Cargar datos del perfil (Usando la función interna)
    mensaje.textContent = "Cargando datos...";
    const data = await getUserProfileInternal(userId);

    if (!data) {
        mensaje.textContent = "❌ Error: No se encontró el perfil en la tabla 'users'.";
        return;
    }

    // Llenar formulario con datos de la tabla 'users'
    document.getElementById("username").value = data.username || "";
    document.getElementById("avatar_url").value = data.avatar_url || "";
    mensaje.textContent = "";

    // 3. Actualizar datos (Usando la función interna)
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        mensaje.textContent = "Actualizando...";
        mensaje.className = "mt-4 text-center font-medium text-gray-400";

        const username = document.getElementById("username").value.trim();
        const avatar_url = document.getElementById("avatar_url").value.trim();

        // Construir objeto de actualización
        const updates = { username, avatar_url };

        try {
            await updateUserProfileInternal(userId, updates);

            mensaje.textContent = "✅ Datos actualizados correctamente";
            mensaje.className = "mt-4 text-center font-medium text-green-400";
        } catch (updateError) {
            mensaje.textContent = "❌ Error al actualizar: " + updateError.message;
            mensaje.className = "mt-4 text-center font-medium text-red-400";
            console.error(updateError);
        }
    });
    
    // 4. Cierre de Sesión
    logoutButton.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            mensaje.textContent = `Error al cerrar sesión: ${error.message}`;
            mensaje.className = "mt-4 text-center font-medium text-red-400";
        } else {
            // Regresar a la pantalla de login
            mostrarLogin();
        }
    });
}