import { Fragment } from 'react';

function normalizeOption(option) {
    if (Array.isArray(option)) {
        return { value: option[0], label: option[1] };
    }

    return option;
}

function renderInput(field, value, onChange, disabled) {
    if (field.type === 'textarea') {
        return (
            <textarea
                id={field.id}
                className="form-input"
                rows={field.rows || 4}
                placeholder={field.placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
            />
        );
    }

    if (field.type === 'select') {
        return (
            <select
                id={field.id}
                className="form-input"
                value={value}
                onChange={onChange}
                disabled={disabled}
            >
                {(field.options || []).map(rawOption => {
                    const option = normalizeOption(rawOption);
                    return (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    );
                })}
            </select>
        );
    }

    return (
        <input
            id={field.id}
            type={field.type || 'text'}
            className="form-input"
            placeholder={field.placeholder}
            value={value}
            onChange={onChange}
            min={field.min}
            max={field.max}
            disabled={disabled}
        />
    );
}

function renderField(field, { disabled, form, setForm }) {
    const value = form[field.name] ?? '';
    return (
        <div className="form-group" key={field.id || field.name}>
            <label htmlFor={field.id}>
                {field.label}
                {field.required ? ' *' : ''}
            </label>
            {renderInput(field, value, event => {
                setForm(current => ({ ...current, [field.name]: event.target.value }));
            }, disabled)}
        </div>
    );
}

export default function EntityFormFields({ sections, form, setForm, disabled = false }) {
    return sections.map((section, index) => {
        const fields = section.fields.map(field => renderField(field, { disabled, form, setForm }));
        if (section.row) {
            return (
                <div className="form-row" key={section.key || index}>
                    {fields}
                </div>
            );
        }

        return (
            <Fragment key={section.key || index}>
                {fields}
            </Fragment>
        );
    });
}
