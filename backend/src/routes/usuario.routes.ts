import {
  Router,
  type Router as ExpressRouter,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import {
  registrarUsuario,
  listarUsuarios,
  cambiarEstadoUsuario,
} from '../controllers/usuario.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ExpressRouter = Router();

const requerirRol = (rolesPermitidos: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = (req as any).usuario;
    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      res.status(403).json({
        error: 'Acceso denegado: permisos insuficientes para esta operación.',
      });
      return;
    }
    next();
  };
};

router.post('/', verificarToken, requerirRol(['ADMIN']), registrarUsuario);
router.get('/', verificarToken, requerirRol(['ADMIN']), listarUsuarios);
router.patch(
  '/:id/estado',
  verificarToken,
  requerirRol(['ADMIN']),
  cambiarEstadoUsuario,
);

export default router;
