/**
 * Created by elporfirio on 22/02/17.
 */
(function ($) {
    $.fn.epform = function (options) {
        var settings = $.extend({
            onAfterFormRender: function () {
            }
        }, options);

        //properties
        var self = this;
        self.fields = [];
        self.element = null;
        self.divModal = null;

        self.currentFieldType = null;
        self.tempOptions = [];

        //Edicion
        self.currentFieldToEdit = null;


        self.newComponent = true;
        self.isEdit = false;
        self.templatesFolder = '../resources/templates/';


        //public methods

        /**
         * Inicializa el componente
         */
        self.init = function (selfElement) {
            self.element = selfElement;
            self.divModal = self.element.find('.modal').modal({
                keyboard: false,
                backdrop: 'static',
                show: false
            });

            if (settings.fields !== undefined && settings.fields.length > 0) {
                self.fields = settings.fields;
                paintAllFieldsOnList();
            }
            ////console.log("### Inicializando Form");
            setListeners();
        };

        self.openModal = function () {
            self.divModal.modal('show');
        };

        self.closeModal = function () {
            self.divModal.modal('hide');
        };

        self.getFields = function () {
            return self.fields;
        };

        self.getElement = function () {
            return self.element;
        };

        self.removeFieldsForm = function () {
            self.divModal.find('.form-field-configure').html('');
        };

        function paintAllFieldsOnList() {
            var tmp = $.map(self.fields, function(field){
                field._id = generateTempId();
                return field;
            });
            self.fields = tmp;
            $.each(tmp, function (index, element) {
                updateFieldList('add', element);
            });
        }

        function removeFieldByFieldId(fieldId) {
            var result = $.grep(self.fields, function (element, i) {
                return element._id != fieldId;
            });

            self.fields = result;

            if(self.fields.length == 0){
                self.element.find('.field-list-table').find('tbody').find('.alert-info').parent().show();
            }
        }

        function addNewField() {
            showSelectFieldType();
            self.element.trigger('showing-type-field');
            self.tempOptions = [];
            self.openModal();
        }

        function editField(id){
            self.currentFieldToEdit = getFieldconfiguration(id);
            self.currentFieldType = self.currentFieldToEdit.type;
            renderFieldTemplate(self.currentFieldType);
            //showFieldConfiguration();  Este se activa al terminar el renderizado
            self.openModal();
        }

        // private methods
        /**
         * Agrega los eventos a los botones principales de agregar y guardar
         **/
        function setListeners() {
            if (self.newComponent) {


                self.element.off();

                self.element.find('.add-field-button').on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    addNewField();
                });

                /** Acciones al mostrarse el cuadro de seleccion de tipo de campo **/
                self.element.on('showing-type-field', function () {
                    self.divModal.find('.select-type-field')
                        .off('click')
                        .on('click', function () {
                            formFieldTypeSelected($(this).data('type'));
                        });
                });

                self.element.find('.field-list-table').off()
                    .on('click', '.remove-field', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        //console.error('eliminando', $(this).data('id'));
                        removeFieldByFieldId($(this).data('id'));
                        $(this).parents('tr').remove();
                    })
                    .on('click', '.edit-field', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        editField($(this).data('id'));
                        //fillFieldEdition($(this).data('id'));
                    });

                self.element.on('field-added', function (e, data) {
                    data['_id'] = generateTempId();
                    self.fields.push(data);
                    updateFieldList('add', data);
                    self.closeModal();
                });

                self.element.on('field-updated', function(e,data){
                   //TODO: find id and update
                    updateFields(data.updated, data.current);
                    updateFieldList('update', data.updated, data.current._id);
                    self.closeModal();
                });

                /**
                 * Actions triggered after render form configuration template
                 */
                self.element.off('form-rendered').on('form-rendered', function (e) {
                    if (typeof settings.onAfterFormRender == 'function') {
                        settings.onAfterFormRender.call(self);
                    }
                    if(self.currentFieldToEdit != null){
                        fillFieldConfiguration();
                    }
                    showFieldConfiguration();
                });
            }
            self.newComponent = false;
        }

        function updateFields(updated, current){
            var id = current._id;
            updated._id = id;

            var tmp = $.map(self.fields, function(field){
                if(field._id == id){
                    return updated;
                }
                return field;
            });

            self.fields = tmp;
        }

        function fillFieldConfiguration(){
            $.each(self.currentFieldToEdit.form, function (index, element) {
                if (element.field == 'required' && element.value.toString() == "true") {
                    $('[name="' + element.field + '"]').prop('checked', true);
                }
                else if (element.field == 'options') {
                    element.value.forEach(function (optval) {
                        self.tempOptions.push(optval);

                        $('.option-table').find('tbody').append('<tr>' +
                            '<td>' + optval + '</td>' +
                            '<td> <button class="btn btn-danger btn-remove-option"><i class="fa fa-remove"></i> remove</button></td></tr>');
                    });
                }
                else {
                    $('[name="' + element.field + '"]').val(element.value);
                }
            });
        }

        /**
         * Show type field selection screen
         */
        function showSelectFieldType() {
            self.element.find('.select-form-field-type').show();
            self.element.find('.form-field-configure').hide();
            self.element.find('.cancel-changes').off().on('click', cancelChanges);
            self.element.find('.save-changes').hide().off();
        }

        /**
         * Show configuration form screen
         */
        function showFieldConfiguration() {
            self.element.find('.select-form-field-type').slideUp();
            self.element.find('.form-field-configure').slideDown();
        }

        function getFieldconfiguration(fieldId){
            var fieldToEdit = $.grep(self.fields, function (element, index) {
                return element['_id'] === fieldId;
            });

            return fieldToEdit[0];
        }

        function generateTempId() {
            return Math.floor(Math.random() * 26) + Date.now();
        }


        function cancelChanges() {
            self.tempOptions = [];
            self.currentFieldType = null;
            self.currentFieldToEdit = null;
            self.closeModal();
        }

        function saveChanges(e) {
            e.preventDefault();
            e.stopPropagation();

            var formElements = self.element.find('.form-field-configure').find('input, select');

            var changes = $.map(formElements, function (element) {
                if (!element.disabled) {

                    //Ignore add option field from (check-list and option-list)
                    if (element.name == 'new-option') {
                        return;
                    }

                    if (element.type == 'checkbox') {
                        if (element.checked) {
                            return {
                                field: element.name,
                                value: true
                            };
                        } else {
                            return {
                                field: element.name,
                                value: false
                            };
                        }
                    }
                    return {
                        field: element.name,
                        value: element.value
                    };
                }
            });

            if (self.currentFieldType == 'option-list' || self.currentFieldType == 'check-list') {
                var options = {
                    field: 'options',
                    value: self.tempOptions
                };

                self.tempOptions = [];

                changes.push(options)
            }

            var changesToSubmit = {form: changes, type: self.currentFieldType};


            if(self.currentFieldToEdit != null){
                self.element.trigger('field-updated', {current: self.currentFieldToEdit, updated: changesToSubmit});
                self.currentFieldToEdit = null;
            } else {
                self.element.trigger('field-added', changesToSubmit);
            }
        }

        function removeEmptyMessage(){
            self.element.find('.field-list-table').find('tbody').find('.alert-info').parent().hide();
        }
        function updateFieldList(update, data, id) {
            removeEmptyMessage();
            var tbody = self.element.find('.field-list-table').find('tbody');

            if (update == 'add') {
                ////console.warn(data);

                tbody.append('<tr>' +
                    '<td>' + getFieldValue('fieldname', data.form) + '</td>' +
                    '<td>' + data.type + '<br>' + getFieldValue('fieldtype', data.form) + '</td>' +
                    '<td><span class="label label-info">' + getFieldValue('typevalidation', data.form) + '</span><br>' +
                    ((getFieldValue('required', data.form) == 'true') ? '<span class="label label-danger">required</span>' : '') + '</td>' +
                    '<td>' +
                    '   <button class="btn btn-info btn-sm edit-field" data-id="' + data['_id'] + '"> <i class="fa fa-pencil"></i> edit</button>' +
                    '   <button class="btn btn-flat btm-sm remove-field" data-id="' + data['_id'] + '"> <i class="fa fa-remove"></i> remove</button>' +
                    '</td>' +
                    '</tr>');
            } else if (update == 'update') {

                //TODO: review this
                var some = tbody.find('button[data-id=' + id + ']').parents('tr');

                //TODO: editType
                some.html('<td>' + getFieldValue('fieldname', data.form) + '</td>' +
                    '<td>' + data.type + '<br>' + getFieldValue('fieldtype', data.form) + '</td>' +
                    '<td><span class="label label-info">' + getFieldValue('typevalidation', data.form) + '</span><br>' +
                    ((getFieldValue('required', data.form) == 'true') ? '<span class="label label-danger">required</span>' : '') + '</td>' +
                    '<td>' +
                    '   <button class="btn btn-info btn-sm edit-field" data-id="' + id + '"> <i class="fa fa-pencil"></i> edit</button>' +
                    '   <button class="btn btn-flat btm-sm remove-field" data-id="' + id + '"> <i class="fa fa-remove"></i> remove</button>' +
                    '</td>');

            }

        }

        function getFieldValue(fieldType, fieldArray) {
            var objeto = $.grep(fieldArray, function (element, index) {
                return element.field == fieldType;
            });

            //objeto[0].value
            return (objeto[0] !== undefined) ? objeto[0].value.toString() : '';
        }

        /**
         * Get and render field configuration template by type, and add events
         * @param type
         */
        function renderFieldTemplate(type) {
            self.element.find('.form-field-configure')
                .load(self.templatesFolder + type + '-template.html', function () {
                    // Special cases
                    if (type == 'input-data') {
                        self.element.find('.type-validation').on('change', function () {
                            //////console.warn($(this).val());
                            if ($(this).val() === 'custom') {
                                self.element.find('.regular-expresion').show()
                                    .find('input').prop('disabled', false);
                            } else {
                                self.element.find('.regular-expresion').hide()
                                    .find('input').prop('disabled', true);
                            }
                        });
                    }
                    else if (type == 'option-list' || type == 'check-list') {
                        self.element.find('.option-table').on('click', '.btn-remove-option', function (e) {
                            e.preventDefault();
                            e.stopPropagation();

                            var parentTR = $(this).parents('tr');
                            self.tempOptions = $.grep(self.tempOptions, function (element, index) {
                                //TODO: improve delete by ID
                                var currentValue = parentTR.find('td').first().text();
                                return element != currentValue;
                            });

                            //Remove from view
                            ////console.info(self.tempOptions);
                            parentTR.remove();
                        });

                        self.element.find('.add-option').on('click', function () {

                            var currentInput = $(this).parents('tr').find('input');
                            var mewOptionValue = currentInput.val();
                            //TODO: on save changes add a options field
                            self.tempOptions.push(mewOptionValue);
                            currentInput.val('');

                            $('.option-table').find('tbody').append('<tr>' +
                                '<td>' + mewOptionValue + '</td>' +
                                '<td> <button class="btn btn-danger btn-remove-option"><i class="fa fa-remove"></i> remove</button></td></tr>');
                        });
                    }
                    else if (type == 'text') {
                        //TODO: check special situations
                    }
                    else if (type == 'button') {
                        //TODO: check special situations
                    }
                    self.element.find('.save-changes').show().off().on('click', saveChanges);
                    self.element.find('.cancel-changes').off().on('click', cancelChanges);

                    //WHEN DONE
                    self.element.trigger('form-rendered');
                });

        }

        function formFieldTypeSelected(type) {
            self.currentFieldType = type;
            renderFieldTemplate(type);
        }

        // ADD plugin to each element
        return this.each(function () {
            var $self = $(this);

            console.log('obteniendoTemplate');
            $.get(self.templatesFolder + 'config-modal-template.html', function (result) {

                var template = result;
                $self.html(template);

                //Inicializar Plugin
                self.init($self);
            });

        });
    };

    // external private method
    function privateMethod() {
        ////console.log('DO NOTHING');
    }
}(jQuery));
