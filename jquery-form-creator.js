/**
 * Created by elporfirio on 22/02/17.
 */
(function ($) {
    $.fn.epform = function (options) {
        var settings = $.extend({}, options);

        //properties
        var self = this;
        self.element = null;
        self.divModal = null;
        self.newComponent = true;
        self.formElementType = null;
        self.fields = [];
        self.isEdit = false;
        self.currentFieldToEdit = null;
        self.templatesFolder = '../resources/templates/';

        self.tempOptions = [];

        //public methods

        /**
         * Inicializa el componente
         */
        self.init = function () {
            if (settings.fields !== undefined && settings.fields.length > 0) {
                //console.log("### Inicializando para Edición");
                ////console.info(settings.fields);
                self.fields = settings.fields;
                paintAllFieldsOnList();
            }
            ////console.log("### Inicializando Form");
            setListeners();
        };

        self.hideModal = function () {
            self.divModal.modal('hide');
        };

        self.getFields = function () {
            return self.fields;
        };

        self.removeFieldsForm = function () {
            self.divModal.find('.form-field-configure').html('');
        };

        function paintAllFieldsOnList() {
            $.each(self.fields, function (index, element) {
                element['_id'] = generateTempId(); //ID se require para saber que elemento se esta actualizando
                updateFieldList('add', element);
            });
        }

        function removeFieldByFieldId(fieldId){
            var result = $.grep(self.fields, function (element, i){
                return element._id != fieldId;
            });

            self.fields = result;
        }

        // private methods
        /**
         * Agrega los eventos a los botones principales de agregar y guardar
         **/
        function setListeners() {
            if (self.newComponent) {
                self.divModal = self.element.find('.modal');

                self.element.off();

                self.element.find('.add-button').on('click', function () {
                    openModal(true);
                });

                /** Acciones al mostrarse el cuadro de seleccion de tipo de campo **/
                self.element.on('showing-type-field', function () {
                    self.divModal.find('.select-type-field').off('click').on('click', function () {
                        ////console.log("#### Tipo elegido: ", $(this).data('type'));

                        self.tempOptions = [];

                        formFieldTypeSelected($(this).data('type'));
                    });
                });

                self.element.find('.field-list-table').off().on('click', '.remove-field', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    //console.error('eliminando', $(this).data('id'));
                    removeFieldByFieldId($(this).data('id'));
                    $(this).parents('tr').remove();
                })
                    .on('click', '.edit-field', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        ////console.info('editando', $(this).data('id'));
                        fillFieldEdition($(this).data('id'));
                    });

                self.element.on('field-added', function (e, data) {

                    //TODO: QUITAR EL FORM ANTES
                    //self.divModal.find('.modal-body').html('');

                    data['_id'] = generateTempId();
                    self.fields.push(data);
                    updateFieldList('add', data);

                    self.divModal.modal('hide');
                });

                self.element.off('form-rendered').on('form-rendered', function(e){
                    //console.info("EDITIN######", self.currentFieldToEdit);
                    //this works with input-data
                    self.tempOptions = [];
                    if(self.currentFieldToEdit !== null){
                        $.each(self.currentFieldToEdit.form, function (index, element) {
                            if(element.field == 'required' && element.value == "true"){
                                $('[name="' + element.field + '"]').prop('checked', true);
                            }
                            else if(element.field == 'options'){
                                element.value.forEach(function(optval){
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
                    self.currentFieldToEdit = null;

                });
            }
            self.newComponent = false;
        }

        function fillFieldEdition(fieldId) {

            var fieldToEdit = $.grep(self.fields, function (element, index) {
                return element['_id'] === fieldId;
            });

            self.currentFieldToEdit = fieldToEdit[0];

            openModal(false);
            renderFieldTemplate(fieldToEdit[0].type);

            self.isEdit = {id: fieldToEdit[0]._id, type: fieldToEdit[0].type}
        }

        function generateTempId() {
            return Math.floor(Math.random() * 26) + Date.now();
        }

        function openModal(isNew) {
            if (isNew) {
                self.element.find('.select-form-field-type').show();
                self.element.find('.form-field-configure').hide();
                self.divModal.modal('show');
                self.element.trigger('showing-type-field');
            }
            else { //edición
                self.element.find('.select-form-field-type').hide();
                self.element.find('.form-field-configure').show();
                self.divModal.modal('show');
            }
        }


        /** corrige los comportamientos de GigSelect para un select comun **/
        function fixGigSelect() {
            self.element.find('select').children('option').css('display', 'block');
        }

        function saveChanges(e) {
            e.preventDefault();
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

            if (self.formElementType == 'option-list' || self.formElementType == 'check-list') {
                var options = {
                    field: 'options',
                    value: self.tempOptions
                };

                self.tempOptions = [];

                changes.push(options)
            }

            ////console.log('SAVING Changes', changes);

            var csrf = $('#_csrf').val();
            var changesToSubmit = {form: changes, _csrf: csrf, type: self.formElementType};
            ////console.log(JSON.stringify({form: changes, _csrf: csrf, type: self.formElementType}));


            if (self.isEdit) {
                changesToSubmit.type = self.isEdit.type;

                updateFieldList('update', changesToSubmit, self.isEdit.id);
                self.isEdit = false;
            } else {
                self.element.trigger('field-added', changesToSubmit);
            }

        }

        function updateFieldList(update, data, id) {
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
            return (objeto[0] !== undefined) ? objeto[0].value : '';
        }

        function renderFieldTemplate(type) {
            var currentTemplate = $('#' + type + '-template').html();
            self.element.find('.form-field-configure').html(currentTemplate);

            self.element.find('.form-field-configure').load(self.templatesFolder + type + '-template.html', function () {

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
                } else if (type == 'option-list') {
                    self.element.find('.option-table').on('click', '.btn-remove-option', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        var parentTR = $(this).parents('tr');
                        self.tempOptions = $.grep(self.tempOptions, function(element, index){
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
                } else if (type == 'check-list') {
                    self.element.find('.option-table').on('click', '.btn-remove-option', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        var parentTR = $(this).parents('tr');
                        self.tempOptions = $.grep(self.tempOptions, function(element, index){
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

                } else if (type == 'text') {

                } else if (type == 'button') {

                }

                fixGigSelect();
                self.element.find('.save-changes').off().on('click', saveChanges);

                //WHEN DONE
                self.element.trigger('form-rendered');
            });

        }

        function formFieldTypeSelected(type) {
            self.formElementType = type;
            renderFieldTemplate(type);
            self.element.find('.select-form-field-type').slideUp();
            self.element.find('.form-field-configure').slideDown();
        }

        // ADD plugin to each element
        return this.each(function () {
            var $element = $(this);
            self.element = $element;
            var template = $('#hidden-template').html();
            $element.html(template);

            //Inicializar Plugin
            self.init();
        });
    };

    // external private method
    function privateMethod() {
        ////console.log('DO NOTHING');
    }
}(jQuery));
