import * as yup from 'yup';

// Mirror RegisterDto / UpdateUserDto in eventspot-api (username is stricter on purpose: it's a handle).
const username = yup
  .string()
  .trim()
  .required('Elige un nombre de usuario.')
  .matches(/^[a-zA-Z0-9_.]{3,50}$/, 'De 3 a 50 caracteres: letras, números, _ o .');

export type AccountType = 'user' | 'business';

export interface SignUpValues {
  username: string;
  email: string;
  password: string;
  accountType: AccountType;
}

export const signUpSchema = yup.object({
  username,
  email: yup.string().trim().required('Ingresa tu correo.').email('Ingresa un correo válido.'),
  password: yup
    .string()
    .required('Crea una contraseña.')
    .min(8, 'Mínimo 8 caracteres.')
    .max(100, 'Máximo 100 caracteres.'),
  accountType: yup.mixed<AccountType>().oneOf(['user', 'business']).required(),
});

export interface EditProfileValues {
  username: string;
  bio: string;
}

export const editProfileSchema = yup.object({
  username,
  bio: yup.string().max(500, 'La bio no puede pasar de 500 caracteres.'),
});
