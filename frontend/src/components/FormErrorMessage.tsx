export default function FormErrorMessage({ message, id, style }) {
    if (!message) return null;

    return (
        <div className="login-error" id={id} role="alert" style={{ display: 'block', ...style }}>
            {message}
        </div>
    );
}
