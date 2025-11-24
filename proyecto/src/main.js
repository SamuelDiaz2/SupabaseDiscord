import { mostrarAdmin } from "./admin";
import { mostrarLogin } from "./login";
import { mostrarChatMVP } from "./mvp";
import { mostrarRegistro } from "./register";
import { mostrarUser } from "./user";
import { supabase } from './supabase.js';
import { mostrarCrear } from "./crear.js";

const routes = {
'registro': mostrarRegistro,
'login': mostrarLogin,
'actividades': mostrarChatMVP,
'usuarios': mostrarUser,
'admin': mostrarAdmin,
'servidores': mostrarCrear // Asume que tienes una forma de verificar y mostrar el admin
};
async function CerrarSesion() {
await supabase.auth.signOut();
// Después de cerrar sesión, recargar el menú y mostrar el registro
await cargarMenu();
mostrarRegistro();
}
// 🧩 Control de navegación según el estado del usuario
export async function cargarMenu() { // Exportar por si se necesita desde CerrarSesion
const menu = document.getElementById("menu");
const { data: { user } } = await supabase.auth.getUser();
// 🔹 Si NO hay usuario logueado
if (!user) {
menu.innerHTML = `
<div>
<button data-action="registro">Registrarse</button>
<button data-action="login">Iniciar sesión</button>
</div>
`;
} else {
// Asumiendo que quieres mostrar 'admin' si es un administrador

// Nota: Deberías verificar roles aquí, pero por simplicidad se muestra el menú base.
menu.innerHTML = `
<div>
<button data-action="actividades">Actividades</button>
<button data-action="usuarios">Usuarios</button>
<button data-action="logout">Cerrar sesión</button>
<button data-action="servidores">Crear</button>
${user.email === 'sdiazfdez@outlook.com' ? '<button data-action="admin">Admin</button>' : ''}
</div>
`;
}
// 🌟 ASIGNACIÓN DE EVENT LISTENERS (La solución al problema)
menu.querySelectorAll('button').forEach(button => {
const action = button.getAttribute('data-action');
if (action === 'logout') {
button.addEventListener('click', CerrarSesion);
} else if (routes[action]) {
// Asigna la función importada correspondiente al evento click
button.addEventListener('click', routes[action]);
}
});
}
// 🌀 Llamamos la función apenas cargue la página
document.addEventListener("DOMContentLoaded", cargarMenu);